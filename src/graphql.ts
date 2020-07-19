import { ApolloServer } from 'apollo-server-lambda';
import * as jwt from 'jsonwebtoken';
import resolvers from './resolvers';
import typeDefs from './schema';
import './util/env';
import { logger } from './util/logger';

//Used for extracting user info from Auth header
const getScope = async (auth: string): Promise<User | null> => {
  const { JTW_TOKEN, NODE_ENV } = process.env ?? { JWT_TOKEN: 'bad' };
  // Use a default uuid if in development mode
  if (NODE_ENV?.toLowerCase() === 'development') {
    return { uid: 'test_user_1' };
  }

  const token = auth.split(' ')[1];

  let user: User | null = null;
  try {
    user = jwt.verify(token, JTW_TOKEN as jwt.Secret) as User;
  } catch (e) {
    logger.error(e);
  }

  // Now is a good time to get other data on the user from a DB

  return user;
};

// Create the Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ event, context }) => ({
    headers: event.headers,
    functionName: context.functionName,
    event,
    context,
    //authScope: await getScope(event.headers.Authorization), // Use the auth scope above to get user data
  }),
  formatError: (err) => {
    if (process.env.NODE_ENV !== 'PROD') {
      logger.error(err);
    }
    return err;
  },
  tracing: true,
  playground: true,
});

// Export the handler for use on the lambda
exports.graphqlHandler = server.createHandler({
  cors: {
    origin: '*',
    credentials: true,
  },
});
