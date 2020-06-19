
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

function HelloWorldBlock() {
    const base = useBase();
    const table = base.getTableByName(TABLE_NAME);
    const records = useRecords(table);

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
            <AuthClass base={base}/>
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


initializeBlock(() => <HelloWorldBlock />);

class AuthClass extends React.Component {
    
    constructor(props) {
        super(props);
        this.state = {
            status: 'start',
            isLoggedIn: props.isLoggedIn,
            isUpdateInProgress: false
            //base: props.base
        };
        
        // This binding is necessary to make `this` work in the callback
        this.handleAuthClick = this.handleAuthClick.bind(this);
        this.handleSignoutClick = this.handleSignoutClick.bind(this);
        this.onButtonClick = this.onButtonClick.bind(this);
        this.handleClientLoad = this.handleClientLoad.bind(this);
        this.load_script = this.load_script.bind(this);
        this.initClient = this.initClient.bind(this);
        this.updateSigninStatus = this.updateSigninStatus.bind(this);
        this.createCourseTableIfNotExists = this.createCourseTableIfNotExists.bind(this);
        this.createOrUpdateCourseTable = this.createOrUpdateCourseTable.bind(this);
        this.delayAsync = this.delayAsync.bind(this);
        this.getCourses = this.getCourses.bind(this);
        this.clearBody = this.clearBody.bind(this);
        // Promise Interface can ensure load the script only once.
        this.gapi_script = this.load_script(GOOGLE_API_ENDPOINT);
    }

    do_load() {
        var self = this;
        this.gapi_script.then(function () {
            self.setState({ 'status': 'done' });
        }).catch(function () {
            self.setState({ 'status': 'error' });
        })
    }



    /**
     * Append a pre element to the body containing the given message
     * as its text node. Used to display the results of the API call.
     *
     * @param {string} message Text to be placed in pre element.
     */
    appendPre(message) {
        var pre = document.getElementById('content');
        var textContent = document.createTextNode(message + '\n');
        pre.appendChild(textContent);
    }
    /**
     * Clear the body containing the given message
     * as its text node. Used to display the results of the API call.
     *
     */
    clearBody() {
        var pre = document.getElementById('content');
        if(pre){
            pre.innerHTML = '';
        }
    }
    /**
     *  On load, called to load the auth2 library and API client library.
     */
    handleClientLoad() {
        gapi.load('client:auth2', this.initClient);
    }

    load_script(src) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = src;
            script.addEventListener('load', function () {
                self.handleClientLoad();
                resolve();
            });
            script.addEventListener('error', function (e) {
                reject(e);
            });
            document.body.appendChild(script);
        })
    };
    

    /**
     *  Initializes the API client library and sets up sign-in state
     *  listeners.
     */
    initClient() {
        var self = this;
        gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
        }).then(function () {
            // Listen for sign-in state changes.
            gapi.auth2.getAuthInstance().isSignedIn.listen(self.updateSigninStatus);
                // Handle the initial sign-in state.
                self.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
            }, function (error) {
                appendPre(JSON.stringify(error, null, 2));
            });
    }
    /**
     *  Called when the signed in status changes, to update the UI
     *  appropriately. After a sign-in, the API is called.
     */
    updateSigninStatus(isSignedIn) {
        this.setState({'isSignedIn':isSignedIn})
    }

    async onButtonClick() {
        // keep track of whether we have up update currently in progress - if there is, we want to hide
        // the update button so you can't have two updates running at once.
        
        var self = this;
        self.setState({'isUpdateInProgress': true});
        self.getCourses().then(function () {
            self.setState({'isUpdateInProgress': false});
        });
    }

    async createOrUpdateCourseTable(newCourseList, updateCourseList, courseTable) {
        console.log("CREATE OR UPDATE - course list: " + newCourseList);
        if(courseTable != null)
        {
            console.log("inside 'if'");
            // Fetches & saves the updates in batches of MAX_RECORDS_PER_UPDATE to stay under size limits.
            if(newCourseList?.length >0)
            {
                console.log("new courses");
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
            

            // Fetches & saves the updates in batches of MAX_RECORDS_PER_UPDATE to stay under size limits.
            if(updateCourseList?.length >0)
            {
                console.log("new courses");
                let j = 0;
                while (j < updateCourseList?.length) {
                    const updateBatch = updateCourseList.slice(j, j + MAX_RECORDS_PER_UPDATE);
                    // await is used to wait for the update to finish saving to Airtable servers before
                    // continuing. This means we'll stay under the rate limit for writes.
                    if (courseTable.hasPermissionToUpdateRecords(updateBatch)) {
                        await courseTable.updateRecordsAsync(updateBatch);
                    }
                    // Record updates have been saved to Airtable servers.
                    j += MAX_RECORDS_PER_UPDATE;
                }
            }
        }
        
    }

    async createCourseTableIfNotExists() {
        let courseTable = this.props.base.getTableByNameIfExists(COURSE_TABLE_NAME);
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
            if (this.props.base.unstable_hasPermissionToCreateTable(name, fields)) {
                courseTable = await this.props.base.unstable_createTableAsync(name, fields);
            }
        }
        return courseTable;
    }

    coursesAreNotEqual(existingRecord, courseRecord){
        return (existingRecord.getCellValue("CourseId") != courseRecord.fields.CourseId)
        || (existingRecord.getCellValue("Course Name") != courseRecord.fields["Course Name"])
        || (existingRecord.getCellValue("Section") != courseRecord.fields.Section)
        || (existingRecord.getCellValue("DescriptionHeading") != courseRecord.fields.DescriptionHeading)
        || (existingRecord.getCellValue("Description") != courseRecord.fields.Description)
        || (existingRecord.getCellValue("Room") != courseRecord.fields.Room)
        || (existingRecord.getCellValue("CourseState").name != courseRecord.fields.CourseState.name)
        || (existingRecord.getCellValue("Link to Class") != courseRecord.fields["Link to Class"])
    }

    async getCourses() {
        var self = this;
        self.createCourseTableIfNotExists().then(async function (courseTable)
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

                        var existingRecord = query.records.find(record => record.getCellValue("CourseId") === courseRecord.fields.CourseId);
                        if(typeof(existingRecord) === typeof(undefined))
                        {
                            console.log("record doesn't exist yet");
                            newCourseList.push(courseRecord);
                        }
                        else{
                            console.log("record already exists");

                            if(self.coursesAreNotEqual(existingRecord,courseRecord))
                            {
                                console.log("at least one field is different");
                                courseRecord.id = existingRecord.id;
                                console.log("courseRecord: " + JSON.stringify(courseRecord));
                                updateCourseList.push(courseRecord);
                            }
                            else {
                                console.log("courses are equal");
                            }
                        }
                        
                        //listCourseWork(courseId);
                        //listCourseTopics(courseId);
                        // out of respect for the API, we wait a short time
                        // between making requests. If you change this example to use a different API, you might
                        // not need this.
                        await self.delayAsync(50);
                    }
                    query.unloadData();
                }
                else {
                    console.log("no courses found");
                }
                console.log("newCourseList created: " + JSON.stringify(newCourseList));
                self.createOrUpdateCourseTable(newCourseList, updateCourseList, courseTable);
            });
        });
    }
    
    
    delayAsync(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    /**
     *  Sign in the user upon button click.
     */
    handleAuthClick(event) {
        var self = this;
        gapi.auth2.getAuthInstance().signIn().then(function() {
            self.setState({'isLoggedIn': true});
        });
    }

    /**
     *  Sign out the user upon button click.
     */
    handleSignoutClick(event) {
        var self = this;
        gapi.auth2.getAuthInstance().signOut().then(function() {
            self.setState({'isLoggedIn': false});
            self.clearBody();
        });
    }

    render() {
        const isLoggedIn = this.state.isLoggedIn;
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
                {this.state.isUpdateInProgress ? (
                    <Loader />
                ) : (
                    <Fragment>
                        <Button
                            variant="primary"
                            onClick={this.handleAuthClick}
                            marginBottom={3}
                            id="authorize_button"
                            style={isLoggedIn ? { display: "none" } : { display: "block" }}
                        >Authorize</Button>
                        <Button
                            variant="primary"
                            onClick={this.onButtonClick}
                            marginBottom={3}
                            style={isLoggedIn ? { display: "block" } : { display: "none" }}
                            id="sync_button"
                        >
                            Sync with Google Classroom
                        </Button>
                        <Button
                            onClick={this.handleSignoutClick}
                            marginBottom={3}
                            id="signout_button"
                            style={isLoggedIn ? { display: "block" } : { display: "none" }}
                        >Sign Out</Button>
                        {/* {!permissionCheck.hasPermission &&
                            // when we don't have permission to perform the update, we want to tell the
                            // user why. `reasonDisplayString` is a human-readable string that will
                            // explain why the button is disabled.
                            permissionCheck.reasonDisplayString} */}
                    </Fragment>
                )}
                
            </>
        );
    }
}
