
import { initializeBlock, useBase, useRecords, Loader, Button, Box } from '@airtable/blocks/ui';
import React, { Fragment, useState } from 'react';
import { appendPre, listCourses, clearBody } from './googleClassroomSync';
const credentials = require('../../../../../credentials.json')

// These values match the base for this example: https://airtable.com/shrIho8SB7RhrlUQL
const TABLE_NAME = 'Table 1';
const TITLE_FIELD_NAME = 'Name';
const EXTRACT_FIELD_NAME = 'Notes';
const IMAGE_FIELD_NAME = 'Attachments';

// Airtable SDK limit: we can only update 50 records at a time. For more details, see
// https://github.com/Airtable/blocks/blob/master/packages/sdk/docs/guide_writes.md#size-limits--rate-limits
const MAX_RECORDS_PER_UPDATE = 50;
const GOOGLE_API_ENDPOINT = 'https://apis.google.com/js/api.js';
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

export var courses;
export var topics;
export var assignments;

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
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(function () {
        gapi.auth2.getAuthInstance().signOut().then(function() {
        // Listen for sign-in state changes.
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

function Begin() {
    const base = useBase();
    const courseTable = base.getTableByName(TABLE_NAME);
    const records = useRecords(courseTable);

    return (
        <SyncClass courseTable={courseTable} records={records} />
    );

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

initializeBlock(() => <Begin />);


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