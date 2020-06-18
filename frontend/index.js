
import { initializeBlock, useBase, useRecords, Loader, Button, Box } from '@airtable/blocks/ui';
import React, { Fragment, useState } from 'react';
const credentials = require('../../../../../credentials.json')

// These values match the base for this example: https://airtable.com/shrIho8SB7RhrlUQL
const TABLE_NAME = 'Table 1';

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

export var courseList = [];
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
            gapi.auth2.getAuthInstance().signOut().then(function(){
                gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
    
                    // Handle the initial sign-in state.
                    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                    authorizeButton.onclick = handleAuthClick;
                    signoutButton.onclick = handleSignoutClick;
                }, function (error) {
                    appendPre(JSON.stringify(error, null, 2));
                });
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
        listCourses();
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

    return (
        <SyncClass table={table} records={records} />
    );

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
/**
 * Print the names of the first 10 courses the user has access to. If
 * no courses are found an appropriate message is printed.
 */
function listCourses() {
    gapi.client.classroom.courses.list().then(function (response) {
        var courses = response.result.courses;
        appendPre('Courses:');

        if (courses.length > 0) {
            for (var i = 0; i < courses.length; i++) {
                var course = courses[i];
                appendPre(course.name);
                var courseId = course.id;
                courseList.push(course);
                listCourseWork(courseId);
                listCourseTopics(courseId);
            }
        }
        else {
            console.log("no courses found");
            appendPre('No courses found.');
        }
    });

    //write courses to database
    //createOrUpdateCourseTable(courses);
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
var gapi_script = load_script('https://apis.google.com/js/api.js');

initializeBlock(() => <HelloWorldBlock />);

class SyncClass extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            status: 'start'
        };
    }

    do_load = () => {
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
                <button id="authorize_button" style={{ display: "none" }}>Authorize</button>
                <button id="signout_button" style={{ display: "none" }}>Sign Out</button>
                <pre id="content" style={{ "whiteSpace": "pre-wrap" }}></pre>
            </>
        );
    }
}