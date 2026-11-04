# Documentation développeur FlashPay

FlashPay permet à ton application (SaaS) de demander des encaissements par mobile money (MTN, Orange…) dans plusieurs pays d'Afrique.

Cette documentation explique **ce qui est disponible aujourd'hui**, **comment obtenir une clé**, **comment appeler l'API** et **comment recevoir les confirmations de paiement**.

---

## 1. Ce qui est disponible aujourd'hui

| Fonctionnalité | Statut |
|---|---|
| Créer un compte FlashPay | ✅ Disponible |
| Créer une clé **test** (`fp_test_…`) | ✅ Disponible |
| Appeler l'API de **collecte test** (`POST /api/v1/collections`) | ✅ Disponible |
| Enregistrement des transactions test, avec commission calculée | ✅ Disponible |
| Limite de 60 requêtes par minute et par clé | ✅ Disponible |
| Révoquer une clé | ✅ Disponible |
| Notifications de paiement réussi vers ton application (webhook) | ✅ Disponible (à configurer dans la rubrique Développeurs) |
| Créer une clé **live** (`fp_live_…`) | ⏳ Pas encore ouverte |
| Encaissements réels (argent réel) | ⏳ Pas encore ouverts |
| Versements automatiques aux bénéficiaires | ❌ Non prévu dans cette version |

**En clair** : tu peux intégrer et tester l'API complètement, mais **aucun argent réel n'est encaissé tant que les clés live ne sont pas ouvertes**. Elles seront activées après validation de ton compte.

---

## 2. Obtenir une clé de test

1. Crée un compte sur FlashPay, puis connecte-toi.
2. Ouvre la rubrique **Développeurs** dans le tableau de bord.
3. Donne un nom à ton intégration (par exemple « Mon SaaS - staging »), puis clique sur **Créer une clé test**.
4. **Copie la clé immédiatement.** Elle ne sera plus jamais affichée. FlashPay ne garde que sa version chiffrée.

Une clé test commence par `fp_test_`. Elle ne peut déclencher **aucun paiement réel**.

### Règles de sécurité
- Garde la clé **sur ton serveur**, dans une variable d'environnement.
- Ne l'écris **jamais** dans du code côté navigateur (JavaScript, application mobile).
- Ne la commite jamais dans Git.
- Si une clé est exposée, **révoque-la** immédiatement dans la rubrique Développeurs, puis crées-en une nouvelle.

---

## 3. Authentification

Chaque requête doit contenir ta clé dans l'en-tête HTTP `X-FlashPay-Key` :

```
X-FlashPay-Key: fp_test_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 4. Créer une collecte

### Requête

**Méthode et adresse** : `POST https://<adresse-de-flashpay>/api/v1/collections`

**En-têtes** :
- `Content-Type: application/json`
- `X-FlashPay-Key: <ta clé>`

**Corps (JSON)** :

| Champ | Obligatoire | Description |
|---|---|---|
| `country_code` | Oui | Code pays à deux lettres (voir la liste en section 6) |
| `amount` | Oui | Montant strictement supérieur à 0, dans la devise du pays. C'est le montant **demandé** : le payeur voit ce montant + 2,5 % de frais. |
| `mobile` | Oui | Numéro mobile du payeur **sans l'indicatif** du pays (ex. `670000000` pour le Cameroun). |
| `name` | Oui | Nom du payeur |
| `transaction_id` | Non | Ta référence unique. Si absente, FlashPay en génère une. |
| `payment_method` | Oui en live | Opérateur, par exemple `MTN` ou `ORANGE`. |
| `email` | Non | Email du payeur |
| `description` | Non | Libellé affiché au payeur. Par défaut : « Collecte FlashPay ». |
| `pass_digital_charge` | Non | Par défaut `true` : les frais de 2,5 % sont payés par le payeur. |
| `callback_url` | Non | Adresse vers laquelle le payeur revient après paiement réussi. |
| `failed_callback_url` | Non | Adresse vers laquelle le payeur revient en cas d'échec. |

**Exemple** :

```javascript
// À exécuter UNIQUEMENT sur ton serveur
const response = await fetch("https://<adresse-de-flashpay>/api/v1/collections", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-FlashPay-Key": process.env.FLASHPAY_API_KEY,
  },
  body: JSON.stringify({
    country_code: "CM",
    amount: 25000,
    mobile: "670000000",
    name: "Client test",
    transaction_id: "ORDER-1042",
    payment_method: "MTN",
  }),
});

const result = await response.json();
```

### Réponse en cas de succès (`200`) — clé test

```json
{
  "mode": "test",
  "data": {
    "transaction_id": "ORDER-1042",
    "country_code": "CM",
    "currency_code": "XAF",
    "amount": 25000,
    "payment_method": "MTN",
    "status": "pending",
    "platform_fee": 1500,
    "net_payable": 23500,
    "message": "Collecte de test enregistrée. Aucun appel à Swychr et aucun mouvement de fonds n’ont eu lieu."
  }
}
```

### Réponse en cas de succès (`200`) — clé live (quand elle sera ouverte)

```json
{
  "mode": "live",
  "data": {
    "transaction_id": "ORDER-1042",
    "country_code": "CM",
    "currency_code": "XAF",
    "amount": 25000,
    "payment_method": "MTN",
    "status": "pending",
    "platform_fee": 1500,
    "net_payable": 23500,
    "payment_link": "https://…",
    "message": "Demande créée. Redirige le client vers payment_link pour finaliser le paiement."
  }
}
```

Redirige le client vers `payment_link` pour qu'il finalise le paiement sur son téléphone.

**Signification des champs** :
- `status` : `pending` = en attente. Il passe à `successful` une fois le paiement confirmé. Tu seras prévenu par notification (section 5).
- `platform_fee` : commission FlashPay de 6 % du montant demandé, calculée automatiquement.
- `net_payable` : montant que tu reçois après la commission FlashPay (montant demandé − 6 %).

---

## 5. Notifications de paiement (webhook)

Quand un paiement passe à `successful`, FlashPay envoie une requête `POST` à l'adresse https que tu as enregistrée dans la rubrique **Développeurs**, section **Notifications vers ton application**.

**Au moment de l'enregistrement de l'adresse**, FlashPay affiche un **secret** une seule fois. Copie-le et garde-le sur ton serveur.

**Corps de la notification** :

```json
{
  "event": "transaction.successful",
  "created_at": "2026-11-04T08:00:00.000Z",
  "data": {
    "transaction_id": "ORDER-1042",
    "status": "successful",
    "amount": 25000,
    "currency_code": "XAF",
    "country_code": "CM",
    "payment_method": "MTN",
    "environment": "live"
  }
}
```

**En-têtes envoyés** :
- `X-FlashPay-Timestamp` : date d'envoi (en secondes)
- `X-FlashPay-Signature` : signature HMAC-SHA256 de `timestamp + "." + corps`, avec ton secret

**Vérification côté serveur** : recalcule la signature avec ton secret et compare-la à `X-FlashPay-Signature`. Refuse la notification si elle ne correspond pas. Tu peux aussi refuser toute notification dont le timestamp date de plus de 5 minutes.

**Réessais** : si ton serveur ne répond pas, FlashPay réessaie après 2 s puis 6 s (3 tentatives au total). Rends ton traitement **idempotent** : une même `transaction_id` peut arriver plusieurs fois.

---

## 6. Codes d'erreur

| Code | Signification | Que faire |
|---|---|---|
| `400` | Données invalides (pays inconnu, montant nul, champs manquants) | Corrige le corps de la requête |
| `401` | Clé absente, invalide ou révoquée | Vérifie la clé, ou crées-en une nouvelle |
| `403` | Action non autorisée | Vérifie le type de clé |
| `409` | Le `transaction_id` existe déjà | Utilise une référence unique |
| `429` | Plus de 60 requêtes par minute | Attends une minute, puis réessaie |
| `502` | Le prestataire de paiement n'a pas accepté la demande | Réessaie plus tard. La transaction reste en attente chez FlashPay. |
| `503` | Service temporairement indisponible, ou clé live pas encore ouverte | Réessaie plus tard |

Toutes les erreurs renvoient un message lisible au format :

```json
{ "message": "Description de l’erreur." }
```

---

## 7. Pays et devises

| Code | Pays | Devise |
|---|---|---|
| CM | Cameroun | XAF |
| CD | RDC | CDF |
| CG | Congo-Brazzaville | XAF |
| SN | Sénégal | XOF |
| BF | Burkina Faso | XOF |
| BJ | Bénin | XOF |
| NG | Nigeria | NGN |
| RW | Rwanda | RWF |
| CI | Côte d’Ivoire | XOF |
| TG | Togo | XOF |
| ML | Mali | XOF |
| GH | Ghana | GHS |
| KE | Kenya | KES |

Être dans cette liste ne garantit pas que tous les opérateurs sont disponibles pour ton compte.

---

## 8. Frais

- **Commission FlashPay** : **6 %** du montant demandé, pour toutes les devises. Elle est calculée et enregistrée automatiquement.
- **Frais de paiement** : **2,5 %**, payés par le **payeur**. Le client paie donc le montant demandé + 2,5 %. Tu reçois le montant demandé, moins la commission FlashPay.

Exemple pour une collecte de 25 000 FCFA :
- Le payeur paie : 25 000 + 2,5 % = **25 625 FCFA**
- Commission FlashPay (6 %) : **1 500 FCFA**
- Tu reçois : **23 500 FCFA**

Ces taux peuvent changer. Tu seras informé avant toute modification.

---

## 9. Limites

- **60 requêtes par minute et par clé.** Au-delà, la réponse est `429`.
- Les requêtes de test sont enregistrées, mais ne déclenchent aucun paiement réel.

---

## 10. Passer en production

Les clés live ne sont pas encore ouvertes. Avant leur ouverture, FlashPay finalise :
- la vérification d'identité de ton compte,
- l'accord écrit du prestataire de paiement pour l'encaissement,
- un premier test réel, de petit montant, contrôlé par FlashPay.

Quand ces étapes seront terminées, cette documentation sera mise à jour avec la procédure complète.

---

## 11. Support

En cas de problème, indique le `transaction_id`, le code d'erreur et l'heure de la requête. N'envoie jamais ta clé complète : seuls les 15 premiers caractères suffisent pour l'identifier.
