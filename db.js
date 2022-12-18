const Pool = require('pg').Pool
const pool = new Pool({
    user:'postgres',
    password:'user',
    database:'db_contacts',
    port: 5432
})

module.exports = pool