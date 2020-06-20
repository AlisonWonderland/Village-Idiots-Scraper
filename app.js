const { performance } = require('perf_hooks');
const db = require('./db');
const dbConnection = db.connection;
const fetch = require('isomorphic-fetch');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function makeDOMObject(link) {
    const response = await fetch(link);
    const html = await response.text();
    console.log("responseCode: " );
    return await new JSDOM(html).window;
}

function cleanUpCategory(category) {
    if(category == "Item #:") {
        return "scpNum";
    }
    else if(category == "Object Class:") {
        return "objectClass";
    }
    else if(category == "Special Containment Procedures:") {
        return "containmentProcedures";
    }
    else if(category == "Description:") {
        return "description";
    }

    return "unneeded category";
}

// TODO might not need this function
// function getSCPData(elements) {
//     let category = "";
//     let categoryData = "";
//     let scpData = {};

//     for(let i = 2; i < elements.length; ++i) {
//         if(elements[i].children.length > 0) {
//             // Before going to the next category, add current categories data.
//             if(category != "") {
//                 scpData[category] = categoryData;
//                 categoryData = "";
//             }

//             category = cleanUpCategory(elements[i].children[0].textContent);
//             console.log("category: ", category);

//             if(category == "unneeded category") {
//                 break;
//             }
//         }
        
//         categoryData += elements[i].textContent;
//         console.log("category data: ", categoryData);

//         // console.log(elements[i].textContent);
//     }

//     addSCPToDatabase(scpData);
// }


// Double up apostrophes so SQL queries run correctly when apostrophes appear in the SCP text.
// If you use double quotes, you also double up.
function doubleUpQuotes(data) {
    for (const property in data) {
        if(typeof data[property] === "string") {
            data[property] = data[property].replace(/'/g, "''");
        }
    }

    return data;
}

function formatInsertQuery(data) {
    return `INSERT INTO SCPS(scp_number, scp_points, scp_name, object_class, containment_procedures, scp_description) 
    VALUES(${data["scpNum"]}, ${data["points"]}, '${data["name"]}', '${data["objectClass"]}', '${data["containmentProcedures"]}', '${data["description"]}');`;
}

async function getSCPFromSeries(link, scpName) {
    const { document } = await makeDOMObject(link);
    const elements = document.querySelector("#page-content").children;
    let category = "";
    let categoryData = "";
    let scpData = {};
    let scpPoints = document.querySelector(".number").textContent.slice(1,);
    scpPoints = parseInt(scpPoints, 10);

    console.log("SCP points:", scpPoints);

    // Todo this needs to be more robust for different pages.
    // Maybe try to find item # first and then go from there.
    // Skipping image and points.
    for(let i = 2; i < elements.length; ++i) {
        // Check if a strong tag is present. If not then it means the element is most likely
        // a paragraph with information for that category
        if(elements[i].children.length > 0) {
            // Before going to the next category, add current categories data.
            // TODO Test out removing the if.
            if(category != "") {
                scpData[category] = categoryData;
                categoryData = "";
            }

            category = cleanUpCategory(elements[i].children[0].textContent);
            // console.log("category: ", category);

            if(category == "unneeded category") {
                break;
            }
        }
        
        if(category == "scpNum") {
            let scpNum = elements[i].textContent.replace("Item #: SCP-", "");
            categoryData = parseInt(scpNum, 10);
        }
        
        else {
            categoryData += elements[i].textContent;
        }

        // console.log("category data: ", categoryData);
    }    

    scpData["points"] = scpPoints;
    scpData["name"] = scpName;

    scpData = doubleUpQuotes(scpData);
    const insertSQL = formatInsertQuery(scpData);
    dbConnection.query(insertSQL, function (error, results, fields) {
        console.log(results);
        if(error) console.log("Error ooccured writing to the database:", error);
    });
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}   

// TODO Add multithreading for downloading data. Writes to database will be atomic, 
// so it can't be used for that too
async function getSCPSeries(seriesLink) {
    const {document} = await makeDOMObject(seriesLink);
    const scpsList = document.querySelector(".content-panel").getElementsByTagName("ul");

    // Start with the second <ul> because the first one doesn't list any scps
    for(let i = 1; i < scpsList.length; ++i) {
        for(let j = 0; j < scpsList[i].children.length; ++j) {
            // Skip SCP 001 for now
            if(i == 1 && j == 0) 
                continue;
            if(j % 20 == 0)
                await sleep(1500);

            let li = scpsList[i].children[j];
            let aTag = li.children[0];
            let scpLink = "http://www.scp-wiki.net/" + aTag.getAttribute("href");
            // get the text node that includes the SCP's name.
            let scpName = li.childNodes[1].nodeValue.replace(" - ", "");

            console.log("link:", scpLink, "Name:", scpName);

            await getSCPFromSeries(scpLink, scpName);
            await sleep(200);
            // TODO remove to test more than one SCP
            // process.exit(0);
        }

        if(i % 2 == 0) {
            await sleep(2500);
        }
    }
}

// https://stackoverflow.com/a/21294619
function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

async function startScraper() {
    const series = [
        "http://www.scp-wiki.net/scp-series",
        "http://www.scp-wiki.net/scp-series-2",
        "http://www.scp-wiki.net/scp-series-3",
        "http://www.scp-wiki.net/scp-series-4",
        "http://www.scp-wiki.net/scp-series-5",
        "http://www.scp-wiki.net/scp-series-6",
    ]

    for(let link in series) {
        console.log("SERIES:", series[link]);
        let t0 = performance.now();

        await getSCPSeries(series[link]).catch((err) => {
            console.log("Error occured getting series scps!\n", error);
        });

        let t1 = performance.now();
        console.log(`Series took ${millisToMinutesAndSeconds(t1 - t0)} minutes`);
        // TODO remove to test more than one series
        process.exit(0);
    }
}

db.init(dbConnection);
// startScraper();
getSCPSeries("http://www.scp-wiki.net/scp-series");
console.log("ending connection");
dbConnection.end();