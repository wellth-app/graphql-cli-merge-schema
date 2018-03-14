# graphql-cli-merge-schema

merge-graphql-merge-schemas plugin for graphql-cli

## Installation

```
npm i -g graphql-cli graphql-cli-merge-schemas
```

## Usage

Configure the plugin via a `.graphqlconfig`.

The schema will be obtained from `schemas` and output to `output`.

Here is an example:

`.graphqlconfig`

```json
{
  "schemaPath": "src/graphql/schema.graphql",
  "extensions": {
    "merge": {
      "schemas": [
        "src/graphql/schemas/client.graphql",
        "src/graphql/schemas/remote.graphql"
      ],
      "output": "src/graphql/schema.graphql",
      // Or...
      "output": "src/graphql/schema.json"
    }
  }
}
```

You can now run:

```
graphql merge
```
