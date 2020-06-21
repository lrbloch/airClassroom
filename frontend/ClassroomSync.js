import { Loader, Button } from '@airtable/blocks/ui';
import React, { Fragment } from 'react';
import { FieldType } from '@airtable/blocks/models';
import { GOOGLE_API_ENDPOINT, API_KEY, CLIENT_ID, DISCOVERY_DOCS, SCOPES, MAX_RECORDS_PER_UPDATE} from './index';

/** @enum {string} */
const tableType = {
    COURSE: "Course",
    ASSIGNMENT: "Assignments",
    TOPIC: "Topic",
}

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
        this.createTableIfNotExists = this.createTableIfNotExists.bind(this);
        this.syncTableRecords = this.syncTableRecords.bind(this);
        this.delayAsync = this.delayAsync.bind(this);
        this.getCourses = this.getCourses.bind(this);
        this.getAssignments = this.getAssignments.bind(this);
        this.recordsAreNotEqual = this.recordsAreNotEqual.bind(this);
        this.asyncForEach = this.asyncForEach.bind(this);
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


    async syncTableRecords(newRecords, updateRecords, table) {
        if (table != null) {
            // Fetches & saves the updates in batches of MAX_RECORDS_PER_UPDATE to stay under size limits.
            if (newRecords?.length > 0) {
                console.log("new courses");
                let i = 0;
                while (i < newRecords?.length) {
                    console.log("i = " + i);
                    const createBatch = newRecords.slice(i, i + MAX_RECORDS_PER_UPDATE);
                    // await is used to wait for the update to finish saving to Airtable servers before
                    // continuing. This means we'll stay under the rate limit for writes.
                    const recordIds = await table.createRecordsAsync(createBatch);
                    console.log(`new records created with ID: ${recordIds}`);
                    i += MAX_RECORDS_PER_UPDATE;
                }
            }


            // Fetches & saves the updates in batches of MAX_RECORDS_PER_UPDATE to stay under size limits.
            if (updateRecords?.length > 0) {
                console.log("new courses");
                let j = 0;
                while (j < updateRecords?.length) {
                    const updateBatch = updateRecords.slice(j, j + MAX_RECORDS_PER_UPDATE);
                    // await is used to wait for the update to finish saving to Airtable servers before
                    // continuing. This means we'll stay under the rate limit for writes.
                    if (table.hasPermissionToUpdateRecords(updateBatch)) {
                        await table.updateRecordsAsync(updateBatch);
                    }
                    // Record updates have been saved to Airtable servers.
                    j += MAX_RECORDS_PER_UPDATE;
                }
            }
        }
    }

    async createTableIfNotExists(tableName) {
        console.log("Creating Table tableName: " + tableName);
        let table = this.props.base.getTableByNameIfExists(tableName);
        if (table == null) {
            var fields = [];
            switch(tableName)
            {
                case(tableType.COURSE):
                {
                    fields = [
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
                }
                break;
                case tableType.ASSIGNMENT:
                    {
                        fields = [
                            // CourseId will be the primary field of the table.
                            {
                                name: 'AssignmentId', type: FieldType.NUMBER,
                                options: {
                                    precision: 0,
                                }
                            },
                            { name: 'Assignment', type: FieldType.SINGLE_LINE_TEXT },
                            {name: 'Description', type: FieldType.MULTILINE_TEXT},
                            {name: 'Materials', type: FieldType.SINGLE_LINE_TEXT},
                            {
                                name: 'CourseId', type: FieldType.NUMBER,
                                options: {
                                    precision: 0,
                                }
                            },
                            {name: 'Topic', type: FieldType.SINGLE_LINE_TEXT},
                            {name: 'Link', type: FieldType.URL},
                            {name: 'Points', type: FieldType.NUMBER, options: {precision: 0}},
                            { name: 'Updated', type: FieldType.SINGLE_LINE_TEXT },
                            { name: 'Due', type: FieldType.SINGLE_LINE_TEXT }
                        ];
                    }
                    break;
                default:
                    break;
            }
            console.log(`creating ${tableName} table`);
            if (this.props.base.unstable_hasPermissionToCreateTable(tableName, fields)) {
                table = await this.props.base.unstable_createTableAsync(tableName, fields);
            }
        }
        return table;
    }

    recordsAreNotEqual(type, existingRecord, compareRecord) {
        switch(type)
        {
            case tableType.COURSE:
                return (existingRecord.getCellValue("CourseId") != compareRecord.fields.CourseId)
                || (existingRecord.getCellValue("Course Name") != compareRecord.fields["Course Name"])
                || (existingRecord.getCellValue("Section") != compareRecord.fields.Section)
                || (existingRecord.getCellValue("DescriptionHeading") != compareRecord.fields.DescriptionHeading)
                || (existingRecord.getCellValue("Description") != compareRecord.fields.Description)
                || (existingRecord.getCellValue("Room") != compareRecord.fields.Room)
                || (existingRecord.getCellValue("CourseState").name != compareRecord.fields.CourseState.name)
                || (existingRecord.getCellValue("Link to Class") != compareRecord.fields["Link to Class"]);
            case tableType.ASSIGNMENT:
                return ((existingRecord.getCellValue("AssignmentId") != compareRecord.fields.AssignmentId)
                || (existingRecord.getCellValue("Assignment") != compareRecord.fields["Assignment"])
                || (existingRecord.getCellValue("Description") != compareRecord.fields.Description)
                || (existingRecord.getCellValue("Topic") != compareRecord.fields.Topic)
                || (existingRecord.getCellValue("CourseId") != compareRecord.fields.CourseId)
                || (existingRecord.getCellValue("Link") != compareRecord.fields.Link)
                || (existingRecord.getCellValue("Points") != compareRecord.fields.Points)
                || (existingRecord.getCellValue("Updated") != compareRecord.fields.Updated)
                || (existingRecord.getCellValue("Due") != compareRecord.fields.DescriptionHeading));
            default:
                return false;
        }
        
    }


    async getCourses() {
        var self = this;
        console.log("calling createTableIfNotExists from getCourses");
        self.createTableIfNotExists(tableType.COURSE).then(async function (courseTable) {
            const newCourseList = [];
            const updateCourseList = [];
            gapi.client.classroom.courses.list().then(async function (response) {
                var courses = response.result.courses;
                courseTable.selectRecordsAsync().then(async function (query){
                    if (courses?.length > 0) {
                        await self.asyncForEach(courses, async (course) => {
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
                            var existingRecord = await query.records.find(record => record.getCellValue("CourseId") === courseRecord.fields.CourseId);
                            if (typeof (existingRecord) === typeof (undefined)) {
                                console.log("record doesn't exist yet");
                                newCourseList.push(courseRecord);
                            }
                            else {
                                console.log("record already exists");
    
                                if (self.recordsAreNotEqual(tableType.COURSE, existingRecord, courseRecord)) {
                                    console.log("at least one field is different");
                                    courseRecord.id = existingRecord.id;
                                    console.log("courseRecord: " + JSON.stringify(courseRecord));
                                    updateCourseList.push(courseRecord);
                                }
                                else {
                                    console.log("courses are equal");
                                }
                            }
                            await self.getAssignments(courseId).then(async function() {
                                await self.delayAsync(50);
                            });
                        });
                        await query.unloadData();
                    }
                    else {
                        console.log("no courses found");
                    }
                    console.log("newCourseList created: " + JSON.stringify(newCourseList));
                    await self.syncTableRecords(newCourseList, updateCourseList, courseTable);
                });
                
            });
        });
    }

    async asyncForEach(array, callback){
        for(let i = 0; i < array.length; i++)
        {
            await callback(array[i], i, array);
        }
    }
    /**
    * Print the names of the first 10 assignments the user has access to. If
    * no courses are found an appropriate message is printed.
    */
    async getAssignments(id) {
        var self = this;
        console.log("calling createTableIfNotExists from getAssignments");
        await self.createTableIfNotExists(tableType.ASSIGNMENT).then (async function (assignmentTable){
            const newAssignmentList = [];
            const updateAssignmentList = [];
            gapi.client.classroom.courses.courseWork.list({
                courseId: id
            }).then(async function (response) {
                var assignments = response.result.courseWork;
                const query = await assignmentTable.selectRecordsAsync();
                if (assignments.length > 0) {
                    await self.asyncForEach(assignments, async (assignment) => {
                        //TODO: create syncMaterials
                        //var materials = assignments[i].materials;
                        //self.syncMaterials(materials);
                        //TODO: create syncTopics
                        //var topicId = assignments[i].topicId;
                        //self.syncTopics(topicId);
                        var assignmentRecord = {
                            fields: {
                                'AssignmentId':parseInt(assignment.id),
                                'Assignment':assignment.title,
                                'Description':assignment.description,
                                'CourseId': parseInt(id),
                                'Topic': assignment.topicId,
                                'Link': assignment.alternateLink,
                                'Points': assignment.maxPoints,
                                'Updated':assignment.updateTime,
                                'Due':assignment.dueDate ? `${assignment.dueDate.month}/${assignment.dueDate.day}/${assignment.dueDate.year} ${assignment.dueTime.hours}:${assignment.dueTime.minutes}` : '',
                            }
                        };

                        var existingRecord = query.records.find(record => record.getCellValue('AssignmentId') === assignmentRecord.fields.AssignmentId);
                        if(typeof(existingRecord) === typeof(undefined)){
                            console.log("assignment record doesn't exist yet");
                            newAssignmentList.push(assignmentRecord);
                        }
                        else {
                            console.log("assignment record already exists");
                            if (self.recordsAreNotEqual(tableType.ASSIGNMENT, existingRecord, assignmentRecord)) {
                                console.log("at least one field is different");
                                assignmentRecord.id = existingRecord.id;
                                console.log("assignmentRecord: " + JSON.stringify(assignmentRecord));
                                updateAssignmentList.push(assignmentRecord);
                            }
                            else {
                                console.log("assignments are equal");
                            }
                        }
                    });
                }
                else {
                    console.log('No assignments found.');
                }
                self.syncTableRecords(newAssignmentList, updateAssignmentList, assignmentTable);
            });
        })
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