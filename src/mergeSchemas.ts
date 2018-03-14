import {
  buildASTSchema,
  buildClientSchema,
  printSchema,
  parse,
  GraphQLSchema,
  graphql,
} from "graphql";
import { introspectionQuery } from "graphql/utilities";
import * as path from "path";
import * as fs from "fs";
import * as glob from "glob";
import { mergeTypes } from "merge-graphql-schemas";
import { promisify } from "util";

const TEMPORARY_SCHEMA_PATH = "/tmp/schema.json";

export const command = "merge [--output]";
export const desc = "Merges schemas as specified in `.graphqlconfig`";
export const builder = {
  output: {
    alias: "o",
    describe: "Output file",
    type: "string",
  },
};

const loadGlob = async (paths: string[] = []): Promise<string[]> => {
  const normalizedPaths = await Promise.all(
    paths.map(
      (_path): Promise<string[]> =>
        new Promise((resolve, reject) => {
          glob(_path, (error, paths) => {
            if (error) {
              return reject(error);
            }
            resolve(paths || []);
          });
        })
    )
  );

  return normalizedPaths.reduce((returnValue, nextValue) => {
    return [...returnValue, ...nextValue];
  }, []);
};

const mergeSchemas = async (schemaPaths: string[]): Promise<string> => {
  const readFile = promisify(fs.readFile);
  return mergeTypes(
    await Promise.all(schemaPaths.map(value => readFile(value, "utf8")))
  );
};

export const handler = async (context, argv) => {
  const { project, output: argOutput } = argv;
  const { getProjectConfig } = context;
  const {
    configPath,
    config: {
      extensions: {
        merge: {
          schemas = [],
          output: extensionOutput = TEMPORARY_SCHEMA_PATH,
        },
      },
    },
  } = await getProjectConfig(project);
  const writeFile = promisify(fs.writeFile);
  const output = argOutput ? argOutput : extensionOutput;
  const outputPath = path.resolve(output);
  const schemaData = await mergeSchemas(await loadGlob(schemas));

  if (outputPath.endsWith(".json")) {
    const schema = await buildASTSchema(parse(schemaData));
    const results = await graphql(schema, introspectionQuery);
    await writeFile(outputPath, JSON.stringify(results));
  } else if (outputPath.endsWith(".graphql")) {
    await writeFile(outputPath, schemaData);
  } else if (!outputPath) {
    console.log(schemaData);
  } else {
    throw new Error("Invalid output format");
  }
};
