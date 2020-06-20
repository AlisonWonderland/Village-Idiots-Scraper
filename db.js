const mysql = require('mysql');

const con = mysql.createConnection({
  host: "localhost",
  user: "localhost",
  password: "",
  multipleStatements: true
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

module.exports = {
    connection: con,
    init: (conn) => {
        // remove the drop when scraper is ready.
        // DROP DATABASE test;
        const initSQL = 
        `
        DROP DATABASE test;
        CREATE DATABASE test;
        USE test;
        create table SCPS(
           id INT NOT NULL AUTO_INCREMENT,
           scp_number INT NOT NULL,
           scp_points INT NOT NULL,
           scp_name TEXT(256) NOT NULL,
           object_class TEXT(65535) NOT NULL,
           containment_procedures TEXT(65535) NOT NULL,
           scp_description TEXT(65535) NOT NULL,
           PRIMARY KEY (id)
        );`;

        console.log(`CREATE DATABASE test;`);
        conn.query(initSQL, function (error, results, fields) {
            console.log(results);
            // error will be an Error if one occurred during the query
            // results will contain the results of the query
            // fields will contain information about the returned results fields (if any)
        });
    }
};