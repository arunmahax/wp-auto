const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
    },
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
    },
  });
}

module.exports = sequelize;
