import express from 'express';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { execute, subscribe } from 'graphql';
// import { PubSub } from 'graphql-subscriptions';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import path from 'path';
import { fileLoader, mergeTypes, mergeResolvers } from 'merge-graphql-schemas';
import cors from 'cors';
import formidable from 'formidable';
import DataLoader from 'dataloader';
import getModels from './models';
import { authenticateUserByToken, refreshTokens } from './auth';
import { channelBatcher, userBatcher } from './batchFunctions';

const SECRET = 'asdfst32134fds5yq26yga46';
const SECRET2 = 'kajs2j1k2rjfo339mkldaasf';

const typeDefs = mergeTypes(fileLoader(path.join(__dirname, './schema')));
const resolvers = mergeResolvers(fileLoader(path.join(__dirname, './resolvers')));
const PORT = process.env.TEST_PORT || 8081;
const graphqlEndpoint = '/graphql';
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const app = express();
app.use(cors('*'));

// serve static files
app.use('/files', express.static('files'));
const uploadDir = 'files';
const fileMiddleware = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    return next();
  }

  const form = formidable.IncomingForm({
    uploadDir,
  });

  form.parse(req, (error, { operations }, files) => {
    if (error) {
      console.log(error);
    }

    const document = JSON.parse(operations);

    if (Object.keys(files).length) {
      const { file: { type, path: filePath } } = files;
      console.log(type);
      console.log(filePath);
      document.variables.file = {
        type,
        path: filePath,
      };
    }

    req.body = document;
    next();
  });
};

getModels().then((models) => {
  if (!models) {
    console.log('Cannot connect to database after reconnect!');
    return;
  }

  // authentication by token
  app.use(authenticateUserByToken(models, SECRET, SECRET2));

  app.use(
    graphqlEndpoint,
    bodyParser.json(),
    fileMiddleware,
    graphqlExpress(req => ({
      schema,
      context: {
        models,
        user: req.user,
        SECRET,
        SECRET2,
        channelLoader: new DataLoader(ids => channelBatcher(ids, models, req.user)),
        userLoader: new DataLoader(ids => userBatcher(ids, models)),
        serverUrl: process.env.SERVER_URL || 'http://localhost:8081',
      },
    })),
  );

  app.use('/graphiql', graphiqlExpress({
    endpointURL: graphqlEndpoint,
    subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`,
  }));

  const server = createServer(app);

  models.sequelize.sync({ /* force: true */ }).then(() => {
    server.listen(PORT, () => {
      // eslint-disable-next-line
      new SubscriptionServer(
        {
          execute,
          subscribe,
          schema,
          onConnect: async ({ token, refreshToken } /* webSocket */) => {
            if (token && refreshToken) {
              try {
                const { user } = jwt.verify(token, SECRET);
                return { models, user };
              } catch (e) {
                const { user } = await refreshTokens(token, refreshToken, models, SECRET, SECRET2);
                return { models, user };
              }
            }
            return { models };
          },
        },
        {
          server,
          path: '/subscriptions',
        },
      );
    });
  });
});
