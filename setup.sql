CREATE DATABASE test;
-- rename database to Foundation
USE test;
create table SCPS(
   id INT NOT NULL AUTO_INCREMENT,
   scp_name TEXT(256) NOT NULL,
   object_class TEXT(65535) NOT NULL,
   containment_procedures TEXT(65535) NOT NULL,
   scp_description TEXT(65535) NOT NULL,
   PRIMARY KEY (id)
);

-- DROP DATABASE test;