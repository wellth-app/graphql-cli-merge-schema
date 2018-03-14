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
export const builder = {};

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

const mergeSchemas = async (schemaPaths: string[]): Promise<GraphQLSchema> => {
  const readFile = promisify(fs.readFile);
  return await buildASTSchema(
    parse(
      mergeTypes(
        await Promise.all(schemaPaths.map(value => readFile(value, "utf8")))
      )
    )
  );
};

const writeSchema = async (
  schema: GraphQLSchema,
  outputPath: string
): Promise<void> => {
  const writeFile = promisify(fs.writeFile);

  if (outputPath.endsWith(".json")) {
    const results = await graphql(schema, introspectionQuery);
    await writeFile(outputPath, JSON.stringify(results));
  } else if (outputPath.endsWith(".graphql")) {
    await writeFile(outputPath, printSchema(schema));
  } else {
    throw new Error("Invalid output format");
  }
};

export const handler = async (context, argv) => {
  const { project } = argv;
  const { getProjectConfig } = context;
  const { config, configPath } = await getProjectConfig(project);

  const {
    extensions: { merge: { schemas = [], output = TEMPORARY_SCHEMA_PATH } },
  } = config;

  const outputPath = path.resolve(output);
  const schema = await mergeSchemas(await loadGlob(schemas));
  await writeSchema(schema, outputPath);
};
