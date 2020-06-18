
import { initializeBlock, useBase, useRecords, Loader, Button, Box } from '@airtable/blocks/ui';
import React, { Fragment, useState } from 'react';
import {FieldType} from '@airtable/blocks/models';
const credentials = require('../../../../../credentials.json')

// These values match the base for this example: https://airtable.com/shrIho8SB7RhrlUQL
const TABLE_NAME = 'Table 1';
const COURSE_TABLE_NAME = 'Courses';
// const TITLE_FIELD_NAME = 'Courses';

// Airtable SDK limit: we can only update 50 records at a time. For more details, see
// https://github.com/Airtable/blocks/blob/master/packages/sdk/docs/guide_writes.md#size-limits--rate-limits
const MAX_RECORDS_PER_UPDATE = 50;
const GOOGLE_API_ENDPOINT = "https://apis.google.com/js/api.js";
//   // Client ID and API key from the Developer Console
var CLIENT_ID = credentials.CLIENT_ID;
var API_KEY = credentials.API_KEY;

//   // Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/classroom/v1/rest"];

//   // Authorization scopes required by the API; multiple scopes can be
//   // included, separated by spaces.
var SCOPES = 
    "https://www.googleapis.com/auth/classroom.coursework.students " + 
    "https://www.googleapis.com/auth/classroom.coursework.me " +
    "https://www.googleapis.com/auth/classroom.topics";

export var newCourseList = [];
export var topicList = [];
export var assignmentList = [];

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
    var authorizeButton = document.getElementById('authorize_button');
    var signoutButton = document.getElementById('signout_button');
    if(authorizeButton && signoutButton)
    {
        gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
        }).then(function () {
            // Listen for sign-in state changes.
            gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
                // Handle the initial sign-in state.
                updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                authorizeButton.onclick = handleAuthClick;
                signoutButton.onclick = handleSignoutClick;
            }, function (error) {
                appendPre(JSON.stringify(error, null, 2));
            });
    }
}
/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
    var authorizeButton = document.getElementById('authorize_button');
    var signoutButton = document.getElementById('signout_button');
    if (isSignedIn) {
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
    } else {
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
    }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
    gapi.auth2.getAuthInstance().signOut();
    clearBody();
}

function HelloWorldBlock() {
    const base = useBase();

    const table = base.getTableByName(TABLE_NAME);
    const records = useRecords(table);

    //const titleField = table.getFieldByName(TITLE_FIELD_NAME);

    // load the records ready to be updated
    // we only need to load the word field - the others don't get read, only written to.
    //const records = useRecords(table, {fields: [titleField]});

    // keep track of whether we have up update currently in progress - if there is, we want to hide
    // the update button so you can't have two updates running at once.
    const [isUpdateInProgress, setIsUpdateInProgress] = useState(false);

    // check whether we have permission to update our records or not. Any time we do a permissions
    // check like this, we can pass in undefined for values we don't yet know. Here, as we want to
    // make sure we can update the summary and image fields, we make sure to include them even
    // though we don't know the values we want to use for them yet.
    // const permissionCheck = table.checkPermissionsForUpdateRecord(undefined, {
    //     [EXTRACT_FIELD_NAME]: undefined,
    //     [IMAGE_FIELD_NAME]: undefined,
    // });

    async function onButtonClick() {
        setIsUpdateInProgress(true);
        await getCourses()
        setIsUpdateInProgress(false);    
    }

    async function createOrUpdateCourseTable(newCourseList, courseTable) {
        console.log("CREATE OR UPDATE - course list: " + newCourseList);
        if(courseTable != null)
        {
            console.log("creating records");
            // Fetches & saves the updates in batches of MAX_RECORDS_PER_UPDATE to stay under size limits.
            let i = 0;
            while (i < newCourseList?.length) {
                console.log("i = " + i);
                const createBatch = newCourseList.slice(i, i + MAX_RECORDS_PER_UPDATE);
                // await is used to wait for the update to finish saving to Airtable servers before
                // continuing. This means we'll stay under the rate limit for writes.
                const recordIds = await courseTable.createRecordsAsync(createBatch);
                console.log(`new records created with ID: ${recordIds}`);
                i += MAX_RECORDS_PER_UPDATE;
            }
        }
        
    }

    async function createCourseTableIfNotExists() {
        let courseTable = base.getTableByNameIfExists(COURSE_TABLE_NAME);
        if (courseTable == null) {
            const name = COURSE_TABLE_NAME;
            const fields = [
                // CourseId will be the primary field of the table.
                { name: 'CourseId', type: FieldType.NUMBER, 
                    options: {
                        precision: 0, // from 0 to 8 inclusive
                    }
                },
                { name: 'Course Name', type: FieldType.SINGLE_LINE_TEXT },
                { name: 'Section', type: FieldType.SINGLE_LINE_TEXT },
                { name: 'DescriptionHeading', type: FieldType.SINGLE_LINE_TEXT },
                { name: 'Description', type: FieldType.SINGLE_LINE_TEXT },
                { name: 'Room', type: FieldType.SINGLE_LINE_TEXT },
                {
                    name: 'CourseState', type: FieldType.SINGLE_SELECT, options: {
                        choices: [
                            { name: "COURSE_STATE_UNSPECIFIED" },
                            { name: "ACTIVE" },
                            { name: "ARCHIVED" },
                            { name: "PROVISIONED" },
                            { name: "DECLINED" },
                            { name: "SUSPENDED" }
                        ]
                    }
                },
                { name: 'Link to Class', type: FieldType.URL },
            ];
            console.log("creating course table");
            if (base.unstable_hasPermissionToCreateTable(name, fields)) {
                courseTable = await base.unstable_createTableAsync(name, fields);
            }
        }
        return courseTable;
    }

    async function getCourses() {
        createCourseTableIfNotExists().then(async function (courseTable)
        {
            const newCourseList = [];
            const updateCourseList = [];
            gapi.client.classroom.courses.list().then(async function (response) {
                var courses = response.result.courses;
                const query = await courseTable.selectRecordsAsync();
                console.log("query length: " + query.recordIds.length);
                if (courses?.length > 0) {
                    for (var i = 0; i < courses.length; i++) {
                        var course = courses[i];
                        var courseId = course.id;
                        console.log("course ID: " + courseId);
                        var courseRecord = {
                            fields: {
                                'CourseId': parseInt(course.id),
                                'Course Name': course.name,
                                'Section': course.section,
                                'DescriptionHeading': course.descriptionHeading,
                                'Description': course.description,
                                'Room': course.room,
                                'CourseState': {name: course.courseState},
                                'Link to Class': course.alternateLink
                            }
                        };
                        
                        console.log("course state: " + JSON.stringify(course.courseState));
                        var existingRecord = query.records.find(record => record.getCellValue("CourseId") === courseRecord.fields.CourseId);
                        if(typeof(existingRecord) === typeof(undefined))
                        {
                            console.log("record doesn't exist yet");
                            newCourseList.push(courseRecord);
                        }
                        else{
                            console.log("record already exists");
                            //TODO: FIX
                            if((existingRecord.getCellValue("CourseId") != courseRecord.fields.CourseId)
                            || (existingRecord.getCellValue("Course Name") != courseRecord.fields.CourseName)
                            || (existingRecord.getCellValue("Section") != courseRecord.fields.Section)
                            || (existingRecord.getCellValue("DescriptionHeading") != courseRecord.fields.DescriptionHeading)
                            || (existingRecord.getCellValue("Description") != courseRecord.fields.Description)
                            || (existingRecord.getCellValue("Room") != courseRecord.fields.Room)
                            || (existingRecord.getCellValue("CourseState") != courseRecord.fields.CourseState)
                            || (existingRecord.getCellValue("Link to Class") != courseRecord.fields.LinkToClass))
                            {
                                console.log("at least one field is different");
                                updateCourseList.push(courseRecord);
                            }
                        }
                        
                        //listCourseWork(courseId);
                        //listCourseTopics(courseId);
                        // out of respect for the API, we wait a short time
                        // between making requests. If you change this example to use a different API, you might
                        // not need this.
                        await delayAsync(50);
                    }
                    query.unloadData();
                }
                else {
                    console.log("no courses found");
                }
                console.log("newCourseList created: " + JSON.stringify(newCourseList));
                createOrUpdateCourseTable(newCourseList, courseTable);
            });
        });
    }
    
    
    function delayAsync(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    return (
        <Box
        // center the button/loading spinner horizontally and vertically.
        position="absolute"
        top="0"
        bottom="0"
        left="0"
        right="0"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        >
            {isUpdateInProgress ? (
                <Loader />
            ) : (
                <Fragment>
                    <AuthClass/>
                    <Button
                        variant="primary"
                        onClick={onButtonClick}
                        marginBottom={3}
                    >
                        Sync with Google Classroom
                    </Button>
                    {/* {!permissionCheck.hasPermission &&
                        // when we don't have permission to perform the update, we want to tell the
                        // user why. `reasonDisplayString` is a human-readable string that will
                        // explain why the button is disabled.
                        permissionCheck.reasonDisplayString} */}
                 </Fragment>
            )}
        </Box>
    );

}

/**
* Print the names of the first 10 assignments the user has access to. If
* no courses are found an appropriate message is printed.
*/
function listCourseWork(id) {
    gapi.client.classroom.courses.courseWork.list({
        courseId: id
    }).then(function (response) {
        var courseWorks = response.result.courseWork;
        appendPre('CourseWork:');

        if (courseWorks.length > 0) {
            for (var i = 0; i < courseWorks.length; i++) {
                var courseWork = courseWorks[i];
                appendPre("Assignment:" + courseWork.title);
                appendPre("updated: " + courseWork.updateTime);
                appendPre("ID: " + courseWork.id);
                if (courseWork.dueDate != undefined) {
                    appendPre("Due:" + courseWork.dueDate.month + "/" + courseWork.dueDate.day + "/" + courseWork.dueDate.year);
                }
                else
                    appendPre("No Due Date");
            }
        }
        else {
            appendPre('No courseWorks found.');
        }
    });
}

function listCourseTopics(id) {
    gapi.client.classroom.courses.topics.list({
        courseId: id
    }).then(function (response) {
        var topics = response.result.topic;
        if (topics.length > 0) {
            for (var i = 0; i < topics.length; i++) {
                var topic = topics[i];
                appendPre("Topic Name:" + topic.name);
                appendPre("Topic Updated: " + topic.updateTime);
                appendPre("TopicId: " + topic.topicId);
            }
        }
        else {
            appendPre('No topics found.');
        }
    });
}


/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre(message) {
    var pre = document.getElementById('content');
    var textContent = document.createTextNode(message + '\n');
    pre.appendChild(textContent);
}
/**
 * Clear the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 */
function clearBody() {
    var pre = document.getElementById('content');
    var pre = document.getElementById('content');
    pre.innerHTML = '';
}

function load_script(src) {
    return new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = src;
        script.addEventListener('load', function () {
            handleClientLoad();
            resolve();
        });
        script.addEventListener('error', function (e) {
            reject(e);
        });
        document.body.appendChild(script);
    })
};

// Promise Interface can ensure load the script only once.
var gapi_script = load_script(GOOGLE_API_ENDPOINT);

initializeBlock(() => <HelloWorldBlock />);

class AuthClass extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            status: 'start'
            //base: props.base
        };
        
        // This binding is necessary to make `this` work in the callback
        //this.handleAuthClick = this.handleAuthClick.bind(this);
        //this.handleSignoutClick = this.handleSignoutClick.bind(this);
    }

    /**
     *  Sign in the user upon button click.
     */
    handleAuthClick() {
        gapi.auth2.getAuthInstance().signIn();
    }

    /**
     *  Sign out the user upon button click.
     */
    handleSignoutClick() {
        gapi.auth2.getAuthInstance().signOut();
        clearBody();
    }

    do_load() {
        var self = this;
        gapi_script.then(function () {
            self.setState({ 'status': 'done' });
        }).catch(function () {
            self.setState({ 'status': 'error' });
        })
    }

    render() {
        var self = this;
        if (self.state.status === 'start') {
            self.state.status = 'loading';
            setTimeout(function () {
                self.do_load()
            }, 0);
        }

        return (
            <>
                {/* <button id="authorize_button" style={{ display: "none" }} onClick={this.handleAuthClick}>Authorize</button>
                <button id="signout_button" style={{ display: "none" }} onClick={this.handleSignoutClick}>Sign Out</button> */}
                <button id="authorize_button" style={{ display: "none" }}>Authorize</button>
                <button id="signout_button" style={{ display: "none" }}>Sign Out</button>
                <pre id="content" style={{ "whiteSpace": "pre-wrap" }}></pre>
            </>
        );
    }
}
