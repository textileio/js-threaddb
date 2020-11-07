import { JSONSchema } from "@textile/threaddb";

export const schema: JSONSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Person",
  description: "A simple person schema",
  type: "object",

  properties: {
    _id: {
      description: "Field to contain ulid-based instance id",
      type: "string",
    },
    name: {
      description: "Name of the person",
      type: "string",
    },
    age: {
      type: "integer",
      minimum: 1, // Why not?
    },
  },
  required: ["_id", "name", "age"],
};

export type Person = {
  _id: string;
  name: string;
  age: number;
};
