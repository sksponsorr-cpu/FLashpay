# Documentation développeur FlashPay

FlashPay permet à ton application de demander des encaissements par mobile money dans plusieurs pays d'Afrique.

Ce document décrit ce qui existe dans l'API aujourd'hui, tel qu'il est implémenté.

---

## 1. Disponibilité

| Fonctionnalité | Statut |
|---|---|
| Créer une clé **test** (`fp_test_…`) | Disponible |
| Créer une clé **live** (`fp_live_…`) | Disponible, mais les encaissements live sont activés par FlashPay après vérification du compte |
| Créer un encaissement (`POST /api/v1/collections`) | Disponible |
| Consulter un encaissement (`GET /api/v1/collections/{transactionId}`) | Disponible |
| Lister les moyens de paiement d'un pays (`GET /api/v1/payment-methods`) | Disponible |
| Notifications de paiement réussi (webhook) | Disponible, à configurer dans la rubrique Développeurs |
| Révoquer une clé | Disponible (propriétaire de l'application uniquement) |
| Versements automatiques aux bénéficiaires | Non disponible dans l'API |

---

## 2. Obtenir une clé

1. Connecte-toi au tableau de bord FlashPay.
2. Ouvre la rubrique **Développeurs**, choisis l'application concernée.
3. Crée une clé, donne-lui un nom, puis copie-la immédiatement : le secret complet n'est affiché qu'une seule fois.

Une clé test commence par `fp_test_`. Une clé live commence par `fp_live_`.

**Règles de sécurité**
- Garde la clé sur ton serveur, dans une variable d'environnement.
- Ne l'écris jamais dans du code exécuté par le navigateur ou une application mobile.
- Ne la commite jamais dans Git.
- En cas d'exposition, révoque-la aussitôt et crées-en une nouvelle.

---

## 3. Authentification

Chaque requête envoie la clé dans l'en-tête :

```
X-FlashPay-Key: fp_test_xxxxxxxxxxxxxxxxxxxxxxxx
```

Une clé absente, invalide ou révoquée renvoie `401`.

---

## 4. Créer un encaissement

`POST /api/v1/collections`

En-têtes : `Content-Type: application/json` et `X-FlashPay-Key`.

### Corps de la requête

| Champ | Obligatoire | Description |
|---|---|---|
| `country_code` | Oui | Code pays ISO à deux lettres (section 7). |
| `amount` | Oui | Montant supérieur à zéro, dans la devise du pays. |
| `name` | Oui | Nom du payeur. |
| `mobile` | Oui | Numéro mobile du payeur, sans l'indicatif du pays. |
| `payment_method` | Oui en live | Moyen de paiement (voir `GET /api/v1/payment-methods`). |
| `transaction_id` | Non | Ta référence. FlashPay en génère une si elle est absente. |
| `checkout` | Non | `"hosted"` : FlashPay héberge la page de paiement (voir ci-dessous). |
| `description` | Non | Libellé affiché au payeur. |
| `email` | Non | E-mail du payeur. |
| `pass_digital_charge` | Non | `false` : le client ne paie pas les frais (section 8). Par défaut, il les paie. |
| `callback_url` | Non | Adresse vers laquelle le payeur revient après un paiement réussi. |
| `failed_callback_url` | Non | Adresse vers laquelle le payeur revient après un échec. |

### Exemple

```javascript
// À exécuter uniquement côté serveur
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

### Réponse — clé test (`200`)

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
    "message": "Collecte de test enregistrée. Aucun appel au prestataire et aucun mouvement de fonds n’ont eu lieu."
  }
}
```

### Réponse — clé live (`200`)

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

### Mode hébergé (`checkout: "hosted"`)

Avec `checkout: "hosted"`, FlashPay crée un lien de paiement et renvoie `checkout_url`. Redirige ton client vers cette adresse : il choisit son opérateur et valide le paiement sur son téléphone.

```json
{
  "mode": "hosted",
  "data": {
    "transaction_id": "…",
    "checkout_url": "https://<adresse-de-flashpay>/pay/…",
    "currency_code": "XAF",
    "message": "Redirige ton client vers checkout_url. Il choisit son opérateur et valide sur son téléphone."
  }
}
```

Dans ce mode, le montant affiché au client sur la page de paiement inclut les frais du moyen de paiement choisi (section 8).

### Champs de la réponse

- `status` : `pending` pendant la validation, puis `successful` une fois le paiement confirmé. Tu es prévenu par notification (section 5).
- `platform_fee` : commission FlashPay de 6 % du montant demandé.
- `net_payable` : montant que tu reçois, soit le montant demandé moins la commission.

---

## 5. Consulter un encaissement

`GET /api/v1/collections/{transactionId}`

Renvoie l'état de l'encaissement. La clé utilisée doit appartenir à l'application qui l'a créé.

---

## 6. Notifications de paiement (webhook)

Quand un paiement passe à `successful`, FlashPay envoie une requête `POST` à l'adresse https que tu as enregistrée dans la rubrique Développeurs.

**Secret** : au moment de l'enregistrement de l'adresse, FlashPay affiche un secret une seule fois. Garde-le sur ton serveur.

**Corps** :

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

**En-têtes** :
- `X-FlashPay-Timestamp` : date d'envoi, en secondes depuis l'époque Unix.
- `X-FlashPay-Signature` : HMAC-SHA256 en hexadécimal de `timestamp + "." + corps brut`, avec ton secret.

**Vérification** (à faire avant tout traitement) :

1. Recalcule `HMAC-SHA256(secret, "<timestamp>.<corps brut>")` en hexadécimal.
2. Compare-le à `X-FlashPay-Signature` avec une comparaison à temps constant.
3. Refuse la requête si le timestamp a plus de 5 minutes d'écart avec ton horloge.

```js
const crypto = require("crypto");
function isValid(rawBody, signature, timestamp, secret) {
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(signature), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

**Réessais** : si ton serveur ne répond pas, FlashPay renvoie la notification à 2 s, puis à 6 s après le premier envoi, soit 3 tentatives au total. Ton traitement doit être idempotent : utilise `transaction_id` comme clé, car une même notification peut arriver plusieurs fois.

---

## 7. Pays et devises

| Code | Pays | Devise |
|---|---|---|
| CM | Cameroun | XAF |
| CG | Congo-Brazzaville | XAF |
| CD | RDC | CDF |
| SN | Sénégal | XOF |
| BF | Burkina Faso | XOF |
| BJ | Bénin | XOF |
| ML | Mali | XOF |
| CI | Côte d’Ivoire | XOF |
| TG | Togo | XOF |
| NG | Nigeria | NGN |
| GH | Ghana | GHS |
| KE | Kenya | KES |
| RW | Rwanda | RWF |

Les moyens de paiement disponibles dépendent du pays et de ton compte : interroge `GET /api/v1/payment-methods?country_code=…`.

---

## 8. Frais

**Commission FlashPay** : 6 % du montant demandé, prélevée sur ce que tu reçois. Elle est calculée et enregistrée automatiquement (`platform_fee`).

**Frais payés par le client** : ils sont identiques sur la page hébergée (`checkout_url`) et sur l'appel direct. Le client paie le taux affiché dans la tarification FlashPay pour le moyen de paiement choisi, c'est-à-dire le taux du réseau plus la marge FlashPay, avec le minimum du réseau quand il s'applique.

Le montant exact est toujours affiché au client avant validation.

**Exemple** : collecte de 25 000 FCFA au Cameroun, avec le taux actuel de la tarification (10,5 % = 5,5 % + 5 points de marge, sous réserve de mise à jour de la grille) :
- Le client paie : 25 000 + 10,5 % = 27 625 FCFA.
- Commission FlashPay (6 %) : 1 500 FCFA.
- Tu reçois : 23 500 FCFA.

Le paramètre `pass_digital_charge: false` désactive les frais client : le client paie alors exactement le montant demandé.

---

## 9. Codes d'erreur

| Code | Signification |
|---|---|
| `400` | Données invalides (pays inconnu, montant nul, champs manquants) |
| `401` | Clé absente, invalide ou révoquée |
| `403` | Action non autorisée pour cette clé |
| `409` | `transaction_id` déjà utilisé |
| `429` | Trop de requêtes pour cette clé. Réessaie après le délai indiqué dans `Retry-After`. |
| `502` | Le prestataire de paiement n’a pas accepté la demande. La transaction reste en attente. |
| `503` | Service temporairement indisponible, ou fonctionnalité pas encore activée |

Toutes les erreurs renvoient :

```json
{ "message": "Description lisible de l’erreur." }
```

---

## 10. Limites

Chaque clé est limitée en nombre de requêtes par minute. Au-delà, la réponse est `429` avec l'en-tête `Retry-After`.

> La valeur exacte de la limite est définie dans la base de données (fonction `check_api_rate_limit`). Elle doit être confirmée avant d'être communiquée aux développeurs.

---

## 11. Ce qui n'est pas documenté ici

Les routes de paiement par lien, les abonnements, les retraits et l'administration ne sont pas exposés publiquement et ne font pas partie de cette documentation.

---

## 12. Support

En cas de problème, indique le `transaction_id`, le code d'erreur et l'heure de la requête. N'envoie jamais ta clé complète : les 15 premiers caractères suffisent pour l'identifier.
