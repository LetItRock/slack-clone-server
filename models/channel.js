export default (sequelize, DataTypes) => {
  const Channel = sequelize.define(
    'channel',
    {
      name: DataTypes.STRING,
      public: DataTypes.BOOLEAN,
    },
  );

  Channel.associate = (models) => {
    // 1:N
    Channel.belongsTo(models.Team, {
      foreignKey: {
        name: 'teamId',
        field: 'team_id',
      },
    });
    Channel.belongsToMany(models.User, {
      through: 'member',
      foreignKey: {
        name: 'channelId',
        field: 'channel_id',
      },
    });
  };

  return Channel;
};