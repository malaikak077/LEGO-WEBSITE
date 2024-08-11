const setData = require("../data/setData");
const themeData = require("../data/themeData");
require('dotenv').config();
const Sequelize = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    port: 5432,
    dialectModule: require("pg"),
    dialectOptions: {
      ssl: { rejectUnauthorized: false },
    },
  }
);

const Theme = sequelize.define('Theme', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: Sequelize.STRING,
  },
}, {
  timestamps: false,
});

const Set = sequelize.define('Set', {
  set_num: {
    type: Sequelize.STRING,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING,
  },
  year: {
    type: Sequelize.INTEGER,
  },
  num_parts: {
    type: Sequelize.INTEGER,
  },
  theme_id: {
    type: Sequelize.INTEGER,
  },
  img_url: {
    type: Sequelize.STRING,
  },
}, {
  timestamps: false,
});

Set.belongsTo(Theme, { foreignKey: 'theme_id' });

function getAllSets() {
  return Set.findAll({ include: [Theme] });
}

function getSetByNum(setNum) {
  return Set.findAll({ include: [Theme], where: { set_num: setNum } })
  .then(results => {
    if (results.length > 0) return results[0];
    else throw new Error('Unable to find requested set');
  });
}
function getAllThemes() {
  return Theme.findAll();
}
function getSetsByTheme(theme) {
  return Set.findAll({
    include: [Theme],
    where: {
      '$Theme.name$': {
        [Sequelize.Op.iLike]: `%${theme}%`
      },
    },
  }).then(results => {
    if (results.length > 0) return results;
    else throw new Error('Unable to find requested sets');
  });
}
function addSet(setData) {
  return Set.create(setData);
}

function editSet (set_num, setData) {
  return Set.update(setData, { where: { set_num } });
};
function initialize() {
  return sequelize.sync();
}

function deleteSet (set_num)  {
  return Set.destroy({ where: { set_num } });
};
sequelize
  .sync()
  .then(async () => {

    const themeCount = await Theme.count();
    if (themeCount === 0) {
      try {
        await Theme.bulkCreate(themeData);
        await Set.bulkCreate(setData);
        console.log("Data inserted successfully");
      } catch (err) {
        console.log("Error inserting data:", err.message);
        console.log("Validation Error:", err.errors); // Log the detailed validation error
      }
    } else {
      console.log("Data already exists in the database. Skipping data insertion.");
    
    }


  })
  .catch((err) => {
    console.log('Unable to connect to the database:', err);
  });

module.exports = { initialize, getAllSets, getSetByNum, getSetsByTheme ,getAllThemes,addSet,deleteSet,editSet};
