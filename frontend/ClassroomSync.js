import { Loader, Button } from '@airtable/blocks/ui';
import React, { Fragment } from 'react';
import { FieldType } from '@airtable/blocks/models';
import { GOOGLE_API_ENDPOINT, API_KEY, CLIENT_ID, DISCOVERY_DOCS, SCOPES, MAX_RECORDS_PER_UPDATE, COURSE_TABLE_NAME } from './index';

export class ClassroomSync extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            status: 'start',
            isLoggedIn: props.isLoggedIn,
            isUpdateInProgress: false,
            lastSynced: null
            //base: props.base
        };

        // This binding is necessary to make `this` work in the callback
        this.handleAuthClick = this.handleAuthClick.bind(this);
        this.handleSignoutClick = this.handleSignoutClick.bind(this);
        this.syncWithGoogleClassroom = this.syncWithGoogleClassroom.bind(this);
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
        });
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
        if (pre) {
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
        });
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
            self.syncWithGoogleClassroom();
        }, function (error) {
            appendPre(JSON.stringify(error, null, 2));
        });
    }
    /**
     *  Called when the signed in status changes, to update the UI
     *  appropriately. After a sign-in, the API is called.
     */
    updateSigninStatus(isSignedIn) {
        console.log("isSignedIn: " + isSignedIn);
        this.setState({ 'isLoggedIn': isSignedIn });
    }


    async syncWithGoogleClassroom() {
        // keep track of whether we have up update currently in progress - if there is, we want to hide
        // the update button so you can't have two updates running at once.
        var self = this;
        if (self.state.isLoggedIn) {
            self.setState({ 'isUpdateInProgress': true });
            self.getCourses().then(function () {
                var date = new Date(Date.now());
                self.setState({ 'isUpdateInProgress': false });
                self.setState({ 'lastSynced': date.toTimeString().replace(/([0-9]+:[0-9]+:[0-9]+).*/, '$1').toAmPmString() });
            });
        }
    }


    async createOrUpdateCourseTable(newCourseList, updateCourseList, courseTable) {
        console.log("CREATE OR UPDATE - course list: " + newCourseList);
        if (courseTable != null) {
            console.log("inside 'if'");
            // Fetches & saves the updates in batches of MAX_RECORDS_PER_UPDATE to stay under size limits.
            if (newCourseList?.length > 0) {
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
            if (updateCourseList?.length > 0) {
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
                {
                    name: 'CourseId', type: FieldType.NUMBER,
                    options: {
                        precision: 0,
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

    coursesAreNotEqual(existingRecord, courseRecord) {
        return (existingRecord.getCellValue("CourseId") != courseRecord.fields.CourseId)
            || (existingRecord.getCellValue("Course Name") != courseRecord.fields["Course Name"])
            || (existingRecord.getCellValue("Section") != courseRecord.fields.Section)
            || (existingRecord.getCellValue("DescriptionHeading") != courseRecord.fields.DescriptionHeading)
            || (existingRecord.getCellValue("Description") != courseRecord.fields.Description)
            || (existingRecord.getCellValue("Room") != courseRecord.fields.Room)
            || (existingRecord.getCellValue("CourseState").name != courseRecord.fields.CourseState.name)
            || (existingRecord.getCellValue("Link to Class") != courseRecord.fields["Link to Class"]);
    }


    async getCourses() {
        var self = this;
        self.createCourseTableIfNotExists().then(async function (courseTable) {
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
                                'CourseState': { name: course.courseState },
                                'Link to Class': course.alternateLink
                            }
                        };

                        var existingRecord = query.records.find(record => record.getCellValue("CourseId") === courseRecord.fields.CourseId);
                        if (typeof (existingRecord) === typeof (undefined)) {
                            console.log("record doesn't exist yet");
                            newCourseList.push(courseRecord);
                        }
                        else {
                            console.log("record already exists");

                            if (self.coursesAreNotEqual(existingRecord, courseRecord)) {
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

    /**
    * Print the names of the first 10 assignments the user has access to. If
    * no courses are found an appropriate message is printed.
    */
    listCourseWork(id) {
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

    listCourseTopics(id) {
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



    delayAsync(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    /**
     *  Sign in the user upon button click.
     */
    handleAuthClick(event) {
        var self = this;
        gapi.auth2.getAuthInstance().signIn().then(function () {
            self.setState({ 'isLoggedIn': true });
        });
    }

    /**
     *  Sign out the user upon button click.
     */
    handleSignoutClick(event) {
        var self = this;
        gapi.auth2.getAuthInstance().signOut().then(function () {
            self.setState({ 'isLoggedIn': false });
            self.clearBody();
        });
    }

    render() {
        const isLoggedIn = this.state.isLoggedIn;
        var self = this;
        if (self.state.status === 'start') {
            self.state.status = 'loading';
            setTimeout(function () {
                self.do_load();
            }, 0);
        }

        return (
            <>

                {this.state.isUpdateInProgress ? (
                    <Loader />
                ) : (
                        <Fragment>
                            {(this.state.lastSynced != null && this.state.isLoggedIn) ? 
                            (<div>Last Synced: {this.state.lastSynced} </div>) : (<></>)}
                            <Button
                                variant="primary"
                                onClick={this.handleAuthClick}
                                marginBottom={3}
                                id="authorize_button"
                                style={isLoggedIn ? { display: "none" } : { display: "block" }}
                            >Connect and Sync with Google Classroom</Button>
                            <Button
                                variant="primary"
                                onClick={this.syncWithGoogleClassroom}
                                marginBottom={3}
                                style={isLoggedIn ? { display: "block" } : { display: "none" }}
                                id="sync_button"
                            >
                                Update
                        </Button>
                            <Button
                                onClick={this.handleSignoutClick}
                                marginBottom={3}
                                id="signout_button"
                                style={isLoggedIn ? { display: "block" } : { display: "none" }}
                            >Sign Out</Button>


                        </Fragment>
                    )}

            </>
        );
    }
}

String.prototype.toAmPmString = function () {
    var ampm = "am";
    var hoursRegex = /^([0-9]+):/;
    var secondsRegex = /^([0-9]+:[0-9]+)(:[0-9]+)/;
    var hours = parseInt(this.match(hoursRegex)[0]);
    console.log("hours: " + hours);
    if(hours > 12 && hours < 24){
        hours = hours-12;
        ampm = "pm";
    }
    if(hours == 24) {
        hours = 12;
        ampm = "am";
    }
    return (this.replace(hoursRegex, hours + ":").replace(secondsRegex,"$1") +" " +ampm);
};