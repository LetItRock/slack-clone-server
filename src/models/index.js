import Sequelize from 'sequelize';

const dbName = process.env.POSTGRESS_DB;
const dbUser = process.env.POSTGRESS_USER;
const dbPassword = process.env.POSTGRESS_PASSWORD;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default async () => {
  let maxReconnects = 20;
  let connected = false;
  let sequelize;

  while (!connected && maxReconnects) {
    try {
      sequelize = new Sequelize(process.env.TEST_DB || dbName, dbUser, dbPassword, {
        dialect: 'postgres',
        operatorAliases: Sequelize.Op,
        host: process.env.DB_HOST || 'localhost',
        define: {
          underscored: true,
        },
      });
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
