import Sequelize from 'sequelize';

const dbName = process.env.POSTGRES_DB;
const dbUser = process.env.POSTGRES_USER;
const dbPassword = process.env.POSTGRES_PASSWORD;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default async () => {
  let maxReconnects = 20;
  let connected = false;
  const sequelize = new Sequelize(process.env.TEST_DB || dbName, dbUser, dbPassword, {
    dialect: 'postgres',
    operatorAliases: Sequelize.Op,
    host: process.env.DB_HOST || 'localhost',
    define: {
      underscored: true,
    },
  });

  while (!connected && maxReconnects) {
    try {
      // eslint-disable-next-line
      await sequelize.authenticate();
      connected = true;
    } catch (e) {
      console.log('reconnect in 5 seconds');
      // eslint-disable-next-line
      await sleep(5000);
      maxReconnects -= 1;
    }
  }
  
  if (!connected) return null;

  const models = {
    User: sequelize.import('./user'),
    Channel: sequelize.import('./channel'),
    Message: sequelize.import('./message'),
    Team: sequelize.import('./team'),
    Member: sequelize.import('./member'),
    DirectMessage: sequelize.import('./directMessage'),
    PCMember: sequelize.import('./privateChannelMember'),
  };
  
  Object.keys(models).forEach((modelName) => {
    if (models[modelName].associate) {
      models[modelName].associate(models);
    }
  });
  
  models.sequelize = sequelize;
  models.Sequelize = Sequelize;
  models.op = Sequelize.Op;

  return models;
}
