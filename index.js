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
import models from './models';
import { authenticateUserByToken, refreshTokens } from './auth';

const SECRET = 'asdfst32134fds5yq26yga46';
const SECRET2 = 'kajs2j1k2rjfo339mkldaasf';

const typeDefs = mergeTypes(fileLoader(path.join(__dirname, './schema')));
const resolvers = mergeResolvers(fileLoader(path.join(__dirname, './resolvers')));
const PORT = process.env.TEST_PORT || 8081;
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const app = express();
app.use(cors('*'));

// authentication by token
app.use(authenticateUserByToken(models, SECRET, SECRET2));

const graphqlEndpoint = '/graphql';

app.use(
  graphqlEndpoint,
  bodyParser.json(),
  graphqlExpress(req => ({
    schema,
    context: {
      models,
      user: req.user,
      SECRET,
      SECRET2,
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
        onConnect: async ({ token, refreshToken }, webSocket) => {
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
