# Remote encryption POC - Textile js-threaddb

## Motivation

Apps like Signal for messaging, LastPass for password management, and Cryptomator for file storage provide client-side encryption.  Client-side encryption is the most secure option for privacy-conscious users, because even in the event of an internal or external hack into the remote host's filesystem or applications, user data is not readble, assuming the hacker does not have the encryption key.  

Client-side encryption options for document storage solutions are limited.  One reason for this is that most search providers (e.g. Elasticsearch, or in-database search options using database indexes) perform search on the remote.  Because encrypted data cannot be searched (except in limited cases using property-preserving encryption), having data encrypted on the remote precludes performing searches on the remote.

One solution to this problem is to store search indexes locally and keep data encrypted on the remote.  A local-first database solution like js-threaddb, Dexie, or pouchdb, is ideal to enable the encrypt-on-remote / search-on-local approach to data privacy.

## Approach in js-threadb

The most straightforward approach to the "encrypt-on-remote" requirement is to encrypt data on push to the remote, and decrypt data on pull from the remote.  Using the prior-art [dexie-encrypted](https://github.com/mark43/dexie-encrypted), and underlying synchronous js crypto library [tweetnacl](https://github.com/dchest/tweetnacl-js) as a starting point, this rough POC shows how encryption can be performed to and from the textile remote.

### Remote schema

The approach of this POC is to use the following schema for data storage on the remote.  By keeping _id decrypted on the remote, data can be accessed quickly by an _id index, while all other data is encrypted and stored in base64 string format.

```typescript
export const encryptedSchema: JSONSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Person",
  description: "Encrypted person schema",
  type: "object",

  properties: {
    _id: {
      description: "Field to contain ulid-based instance id",
      type: "string",
    },
    base64: {
      description: "base64 encoded data",
      type: "string",
    }
  },
  required: ["_id", "base64"],
};
```

## Requirements

To enable this approach, the following modifications had to be made to js-threaddb

### Remote schema differs from local schema

Because the remote schema is encrypted, the remote schema must differ from the local schema.

### Push and pull functions in remote

Encryption had to be applied, and schema converted, before data is pushed to the remote.  Similarly, decryption had to be applied, and schema converted, when data is pulled from the remote.

## Possible plugin approach

One way to achieve this modified behavior using a plugin would be to allow passing three callbacks to the remote code to change its behavior.

### Get schema for collection

```typescript
/**
 * A middleware-provided function to retrieve the correct remote schema for a given collection
 */
function getRemoteCollectionSchema(collectionName): JSONSchema
```

### Pull from remote for collection

```typescript
/**
 * A middleware-provided function to preprocess data inbound from the remote
 * Would allow middleware to decrypt pulled data, and convert it to the correct local schema, before it is applied to the local database
 */
function preProcessRemotePull(collectionName, processor: (remoteData: any) => any): JSONSchema
```

### Push to remote for collection

```typescript
/**
 * A middleware-provided function to process local data before it is sent to the remote
 * Would allow middleware to encrypt data, and convert it to the correct remote schema, before it is pushed to the remote
 */
function preProcessRemotePush(collectionName, processor: (localData: any) => any): JSONSchema
```



