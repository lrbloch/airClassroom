import { Loader, Button, Box, ViewPicker, Tooltip } from '@airtable/blocks/ui';
import React, { Fragment } from 'react';
import { FieldType } from '@airtable/blocks/models';
import ShowAssignments from './ShowAssignments';
import { GOOGLE_API_ENDPOINT, CLIENT_ID, DISCOVERY_DOCS, SCOPES, MAX_RECORDS_PER_UPDATE } from './index';
import { globalConfig } from '@airtable/blocks';

/** @enum {string} */
export const tableType = {
    COURSE: "Courses",
    ASSIGNMENT: "Assignments",
    TOPIC: "Topics",
    MATERIAL: "Materials"
}

/** @enum {string} */
const courseStateType = {
    COURSE_STATE_UNSPECIFIED: "Other",
    ACTIVE: "Active",
    ARCHIVED: "Archived",
    PROVISIONED: "Provisioned",
    DECLINED: "Declined",
    SUSPENDED: "Suspended"
}

/** @enum {bool} */
const submittedStatusType = {
    SUBMISSION_STATE_UNSPECIFIED: false,
    NEW: false,
    CREATED: false,
    TURNED_IN: true,
    RETURNED: true,
    RECLAIMED_BY_STUDENT: false
}



var topicIds = {};
var courseIds = {};
const DEBUG = true;

export class ClassroomSync extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            status: 'start',
            isLoggedIn: props.isLoggedIn,
            isUpdateInProgress: false,
            lastSynced: globalConfig.get(['lastSynced'])
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
        this.syncMaterials = this.syncMaterials.bind(this);
        this.delayAsync = this.delayAsync.bind(this);
        this.getCourses = this.getCourses.bind(this);
        this.getAssignments = this.getAssignments.bind(this);
        this.recordsAreNotEqual = this.recordsAreNotEqual.bind(this);
        this.asyncForEach = this.asyncForEach.bind(this);
        this.syncTopics = this.syncTopics.bind(this);
        this.getTopicNameFromId = this.getTopicNameFromId.bind(this);
        this.getCourseNameFromId = this.getCourseNameFromId.bind(this);
        // Promise Interface can ensure load the script only once.
        this.gapi_script = this.load_script(GOOGLE_API_ENDPOINT);
    }

    do_load() {
        var self = this;
        if (DEBUG) {
            self.setState({ 'status': 'done' });
        }
        else {
            this.gapi_script.then(function () {
                self.setState({ 'status': 'done' });
            }).catch(function () {
                self.setState({ 'status': 'error' });
            });
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
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
        }).then(function () {
            // Listen for sign-in state changes.
            gapi.auth2.getAuthInstance().isSignedIn.listen(self.updateSigninStatus);
            // Handle the initial sign-in state.
            self.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
            if (!DEBUG) {
                self.syncWithGoogleClassroom();
            }
        }, function (error) {
            alert(JSON.stringify(error, null, 2));
        });
    }
    /**
     *  Called when the signed in status changes, to update the UI
     *  appropriately. After a sign-in, the API is called.
     */
    updateSigninStatus(isSignedIn) {
        console.debug("isSignedIn: " + isSignedIn);
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
                var lastSyncedString = date.toTimeString().replace(/([0-9]+:[0-9]+:[0-9]+).*/, '$1').toAmPmString();
                self.setState({ 'isUpdateInProgress': false });
                self.setState({ 'lastSynced': lastSyncedString });
                if (globalConfig.hasPermissionToSet('lastSynced', lastSyncedString)) {
                    globalConfig.setAsync('lastSynced', lastSyncedString);
                }
            });
        }
    }


    async syncTableRecords(newRecords, updateRecords, table) {
        if (table != null) {
            // Fetches & saves the updates in batches of MAX_RECORDS_PER_UPDATE to stay under size limits.
            if (newRecords?.length > 0) {
                console.debug("new courses");
                let i = 0;
                while (i < newRecords?.length) {
                    console.debug("i = " + i);
                    const createBatch = newRecords.slice(i, i + MAX_RECORDS_PER_UPDATE);
                    // await is used to wait for the update to finish saving to Airtable servers before
                    // continuing. This means we'll stay under the rate limit for writes.
                    const recordIds = await table.createRecordsAsync(createBatch);
                    console.debug(`new records created with ID: ${recordIds}`);
                    i += MAX_RECORDS_PER_UPDATE;
                }
            }

            // Fetches & saves the updates in batches of MAX_RECORDS_PER_UPDATE to stay under size limits.
            if (updateRecords?.length > 0) {
                console.debug("new courses");
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

    async syncMaterials(newMaterials, assignmentId) {
        var self = this;
        var materialTable = await this.createTableIfNotExists(tableType.MATERIAL);
        const newMaterialList = [];
        const updateMaterialList = [];
        const query = await materialTable.selectRecordsAsync();
        if (newMaterials?.length > 0) {
            await self.asyncForEach(newMaterials, async (material) => {
                var materialType = material.link ? "Link" : material.driveFile ? "Drive File" : material.youtubeVideo ? "YouTube Video" : material.form ? "Form" : "Other";
                var materialRecord;
                switch (materialType) {
                    case "Link":
                        // "link": {
                        //     "url": "",
                        //     "title": "Subtraction word problem: basketball (video) | Khan Academy",
                        //     "thumbnailUrl": ""
                        // }
                        materialRecord = {
                            fields: {
                                'Material': material.link.title ? material.link.title : "Untitled Link",
                                //todo: better way to ID
                                'Link': material.link.url,
                                'MaterialType': { name: materialType },
                                'AssignmentId': parseInt(assignmentId)
                            }
                        }
                        if (material.link.thumbnailUrl) {
                            materialRecord.fields['Image'] = [{
                                url: material.link.thumbnailUrl.replace("https://classroom.google.com/webthumbnail?url=", ""),
                            }];
                        }
                        break;
                    case "Drive File":
                        // "driveFile": {
                        //     "driveFile": {
                        //         "id": "1F4WlfGx9kW78Xdh3Zr5MLmCxgN3P15lB",
                        //         "title": "Mother's Day thank you letter: Due Fri May 8th, 2020",
                        //         "alternateLink": "https://drive.google.com/drive/folders/1F4WlfGx9kW78Xdh3Zr5MLmCxgN3P15lB"
                        //     },
                        //     "shareMode": "VIEW"
                        // }
                        if (material.driveFile.shareMode === "STUDENT_COPY") {
                            //TODO: add way for student to access their own copy of the file
                            console.debug("this is the teacher's copy of the file");
                        }
                        materialRecord = {
                            fields: {
                                'Material': material.driveFile.driveFile.title ? material.driveFile.driveFile.title : "Untitled File",
                                'Link': material.driveFile.driveFile.alternateLink,
                                'Image': [{
                                    url: material.driveFile.driveFile.alternateLink,
                                }],
                                'MaterialType': { name: materialType },
                                'AssignmentId': parseInt(assignmentId),
                                'Teacher Copy': (material.driveFile.shareMode === "STUDENT_COPY")
                            }
                        }
                        break;
                    case "YouTube Video":
                        // "youtubeVideo": {
                        //     "id": "WyhgubvRYF4",
                        //     "title": "READ ALONG with MICHELLE OBAMA | The Gruffalo | PBS KIDS",
                        //     "alternateLink": "https://www.youtube.com/watch?v=WyhgubvRYF4",
                        //     "thumbnailUrl": "https://i.ytimg.com/vi/WyhgubvRYF4/default.jpg"
                        // }
                        materialRecord = {
                            fields: {
                                'Material': material.youtubeVideo.title ? material.youtubeVideo.title : "Untitled Video",
                                'Link': material.youtubeVideo.alternateLink,
                                'Image': [{
                                    url: material.youtubeVideo.thumbnailUrl,
                                }],
                                'MaterialType': { name: materialType },
                                'AssignmentId': parseInt(assignmentId)
                            }
                        }
                        break;
                    case "Form":
                        // "form": {
                        //     "formUrl": string,
                        //     "responseUrl": string,
                        //     "title": string,
                        //     "thumbnailUrl": string
                        //   }                       
                        materialRecord = {
                            fields: {
                                'Material': material.form.title ? material.form.title : "Untitled Form",
                                'Link': material.form.formUrl,
                                'Image': [{
                                    url: material.form.thumbnailUrl,
                                }],
                                'MaterialType': { name: materialType },
                                'AssignmentId': parseInt(assignmentId)
                            }
                        }
                        break;
                    case "Other":
                    default:
                        console.error(`no matching type for this material: ${JSON.stringify(material)}`);
                        return;
                }

                var existingRecord = await query.records.find(
                    record => record.getCellValue("Material") === materialRecord.fields.Material && record.getCellValue("AssignmentId") === materialRecord.fields.AssignmentId);
                if (typeof (existingRecord) === typeof (undefined)) {
                    console.debug("material record doesn't exist yet: " + materialRecord.fields.Material);
                    newMaterialList.push(materialRecord);
                }
                else {
                    console.debug("material record already exists");

                    if (self.recordsAreNotEqual(tableType.MATERIAL, existingRecord, materialRecord)) {
                        console.debug("at least one field is different: " + JSON.stringify(materialRecord));
                        materialRecord.id = existingRecord.id;
                        updateMaterialList.push(materialRecord);
                    }
                    else {
                        console.debug("materials are equal");
                    }
                }
            });
            await query.unloadData();
        }
        else {
            console.debug("no materials found");
        }
        console.debug("newMaterials created: " + JSON.stringify(newMaterialList));
        await self.syncTableRecords(newMaterialList, updateMaterialList, materialTable);
    }

    async syncTopics(id) {
        var self = this;
        await gapi.client.classroom.courses.topics.list({
            courseId: id
        }).then(async function (response) {
            var topics = response.result.topic;
            console.debug("syncing topics: " + JSON.stringify(topics));
            await self.createTableIfNotExists(tableType.TOPIC).then(async function (topicTable) {
                const newTopicList = [];
                const updateTopicList = [];
                topicTable.selectRecordsAsync().then(async function (query) {
                    if (topics?.length > 0) {
                        await self.asyncForEach(topics, async (topic) => {
                            var topicRecord = {
                                fields: {
                                    'Topic': topic.name,
                                    'TopicId': parseInt(topic.topicId),
                                    'CourseId': parseInt(id)
                                }
                            }
                            var existingRecord = await query.records.find(record => record.getCellValue("TopicId") === topicRecord.fields.TopicId);
                            if (typeof (existingRecord) === typeof (undefined)) {
                                console.debug("topic record doesn't exist yet");
                                newTopicList.push(topicRecord);
                            }
                            else {
                                console.debug("topic record already exists");

                                if (self.recordsAreNotEqual(tableType.TOPIC, existingRecord, topicRecord)) {
                                    console.debug("at least one field is different");
                                    topicRecord.id = existingRecord.id;
                                    updateTopicList.push(topicRecord);
                                }
                                else {
                                    console.debug("topics are equal");
                                }
                            }
                            topicIds[topicRecord.fields.TopicId] = topicRecord.fields.Topic;
                        });
                        await query.unloadData();
                    }
                    else {
                        console.debug("no topics found");
                    }
                    console.debug("newTopics created: " + JSON.stringify(newTopicList));
                    await self.syncTableRecords(newTopicList, updateTopicList, topicTable);
                });
            });
        });
    }

    //TODO: Add update in case fields of old table don't match these fields
    async createTableIfNotExists(tableName) {
        console.debug("Creating Table, tableName: " + tableName);
        let table = this.props.base.getTableByNameIfExists(tableName);
        if (table == null) {
            var fields = [];
            switch (tableName) {
                case (tableType.COURSE):
                    {
                        fields = [
                            // Course will be the primary field of the table.
                            { name: 'Course', type: FieldType.SINGLE_LINE_TEXT },
                            {
                                name: 'CourseId', type: FieldType.NUMBER,
                                options: {
                                    precision: 0,
                                }
                            },
                            { name: 'Section', type: FieldType.SINGLE_LINE_TEXT },
                            { name: 'DescriptionHeading', type: FieldType.SINGLE_LINE_TEXT },
                            { name: 'Description', type: FieldType.SINGLE_LINE_TEXT },
                            { name: 'Room', type: FieldType.SINGLE_LINE_TEXT },
                            {
                                name: 'CourseState', type: FieldType.SINGLE_SELECT, options: {
                                    choices: [
                                        { name: "Other" }, //COURSE_STATE_UNSPECIFIED
                                        { name: "Active" },
                                        { name: "Archived" },
                                        { name: "Provisioned" },
                                        { name: "Declined" },
                                        { name: "Suspended" }
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
                            // Assignment will be the primary field of the table.
                            { name: 'Assignment', type: FieldType.SINGLE_LINE_TEXT },
                            {
                                name: 'AssignmentId', type: FieldType.NUMBER,
                                options: {
                                    precision: 0,
                                }
                            },
                            { name: 'Description', type: FieldType.MULTILINE_TEXT },
                            { name: 'Course', type: FieldType.SINGLE_LINE_TEXT },
                            { name: 'Topic', type: FieldType.SINGLE_LINE_TEXT },
                            { name: 'Link', type: FieldType.URL },
                            { name: 'Points', type: FieldType.NUMBER, options: { precision: 0 } },
                            { name: 'Updated', type: FieldType.SINGLE_LINE_TEXT },
                            {
                                name: 'Submitted', type: FieldType.CHECKBOX, options: {
                                    icon: 'check',
                                    color: 'greenBright'
                                }
                            },
                            {
                                name: 'Due', type: FieldType.DATE_TIME, options:
                                {
                                    dateFormat: {
                                        name: 'us'
                                    },
                                    timeFormat: {
                                        name: '12hour'
                                    },
                                    timeZone: 'client',
                                }
                            }
                        ];
                    }
                    break;
                case tableType.MATERIAL:
                    {
                        // "link": {
                        //     "url": "https://www.khanacademy.org/math/early-math/cc-early-math-add-sub-100/cc-early-math-more-fewer-100/v/fewer-word-problems",
                        //     "title": "Subtraction word problem: basketball (video) | Khan Academy",
                        //     "thumbnailUrl": "https://classroom.google.com/webthumbnail?url=https://www.khanacademy.org/math/early-math/cc-early-math-add-sub-100/cc-early-math-more-fewer-100/v/fewer-word-problems"
                        // }
                        // "driveFile": {
                        //     "driveFile": {
                        //         "id": "1F4WlfGx9kW78Xdh3Zr5MLmCxgN3P15lB",
                        //         "title": "Mother's Day thank you letter: Due Fri May 8th, 2020",
                        //         "alternateLink": "https://drive.google.com/drive/folders/1F4WlfGx9kW78Xdh3Zr5MLmCxgN3P15lB"
                        //     },
                        //     "shareMode": "VIEW"
                        // }
                        // "youtubeVideo": {
                        //     "id": "WyhgubvRYF4",
                        //     "title": "READ ALONG with MICHELLE OBAMA | The Gruffalo | PBS KIDS",
                        //     "alternateLink": "https://www.youtube.com/watch?v=WyhgubvRYF4",
                        //     "thumbnailUrl": "https://i.ytimg.com/vi/WyhgubvRYF4/default.jpg"
                        // }
                        fields = [
                            // Material will be the primary field of the table.
                            { name: 'Material', type: FieldType.SINGLE_LINE_TEXT },
                            { name: 'Link', type: FieldType.URL },
                            { name: 'Image', type: FieldType.MULTIPLE_ATTACHMENTS },
                            {
                                name: 'MaterialType', type: FieldType.SINGLE_SELECT, options: {
                                    choices: [
                                        { name: "Link" },
                                        { name: "Drive File" },
                                        { name: "YouTube Video" },
                                        { name: "Other" }
                                    ]
                                }
                            },
                            {
                                name: 'AssignmentId', type: FieldType.NUMBER,
                                options: {
                                    precision: 0,
                                }
                            },
                            {
                                name: 'Teacher Copy', type: FieldType.CHECKBOX, options: {
                                    icon: 'check',
                                    color: 'greenBright'
                                }
                            },
                        ];
                    }
                    break;
                case tableType.TOPIC:
                    {
                        fields = [
                            // Topic will be the primary field of the table.
                            { name: 'Topic', type: FieldType.SINGLE_LINE_TEXT },
                            {
                                name: 'TopicId', type: FieldType.NUMBER,
                                options: {
                                    precision: 0,
                                }
                            },
                            {
                                name: 'CourseId', type: FieldType.NUMBER,
                                options: {
                                    precision: 0,
                                }
                            },
                        ];
                    }
                    break;
                default:
                    console.error(`no tableType matches ${tableName}`);
                    return;
            }
            console.debug(`creating ${tableName} table`);
            if (this.props.base.unstable_hasPermissionToCreateTable(tableName, fields)) {
                table = await this.props.base.unstable_createTableAsync(tableName, fields);
                return table;
            }
            else return null;
        }
        else return table;
    }

    recordsAreNotEqual(type, existingRecord, compareRecord) {
        switch (type) {
            case tableType.COURSE:
                return (existingRecord.getCellValue("CourseId") != compareRecord.fields.CourseId)
                    || (existingRecord.getCellValue("Course") != compareRecord.fields.Course)
                    || (existingRecord.getCellValue("Section") != compareRecord.fields.Section)
                    || (existingRecord.getCellValue("DescriptionHeading") != compareRecord.fields.DescriptionHeading)
                    || (existingRecord.getCellValue("Description") != compareRecord.fields.Description)
                    || (existingRecord.getCellValue("Room") != compareRecord.fields.Room)
                    || (existingRecord.getCellValue("CourseState").name != compareRecord.fields.CourseState.name)
                    || (existingRecord.getCellValue("Link to Class") != compareRecord.fields["Link to Class"]);
            case tableType.ASSIGNMENT:
                return ((existingRecord.getCellValue("AssignmentId") != compareRecord.fields.AssignmentId)
                    || (existingRecord.getCellValue("Assignment") != compareRecord.fieldsAssignment)
                    || (existingRecord.getCellValue("Description") != compareRecord.fields.Description)
                    || (existingRecord.getCellValue("Topic") != compareRecord.fields.Topic)
                    || (existingRecord.getCellValue("Course") != compareRecord.fields.Course)
                    || (existingRecord.getCellValue("Link") != compareRecord.fields.Link)
                    || (existingRecord.getCellValue("Points") != compareRecord.fields.Points)
                    || (existingRecord.getCellValue("Updated") != compareRecord.fields.Updated)
                    || (existingRecord.getCellValue("Submitted") != compareRecord.fields.Submitted)
                    || (existingRecord.getCellValue("Due") != compareRecord.fields.DescriptionHeading));
            case tableType.MATERIAL:
                return ((existingRecord.getCellValue("Material") != compareRecord.fields.Material)
                    || (existingRecord.getCellValue("Link") != compareRecord.fields.Link)
                    || (existingRecord.getCellValue("Image")?.url != compareRecord.fields.Image?.url)
                    || (existingRecord.getCellValue("AssignmentId") != compareRecord.fields.AssignmentId)
                    || (existingRecord.getCellValue("MaterialType").name != compareRecord.fields.MaterialType.name));
            case tableType.TOPIC:
                return ((existingRecord.getCellValue("Topic") != compareRecord.fields.Topic)
                    || (existingRecord.getCellValue("TopicId") != compareRecord.fields.TopicId)
                    || (existingRecord.getCellValue("CourseId") != compareRecord.fields.CourseId));
            default:
                return true;
        }

    }


    async getCourses() {
        var self = this;
        console.debug("calling createTableIfNotExists from getCourses");
        await self.createTableIfNotExists(tableType.COURSE).then(async function (courseTable) {
            const newCourseList = [];
            const updateCourseList = [];
            var response = await gapi.client.classroom.courses.list();
            var courses = response.result.courses;
            console.debug("Courses: " + JSON.stringify(courses));
            const query = await courseTable.selectRecordsAsync();
            if (courses?.length > 0) {
                await self.asyncForEach(courses, async (course) => {
                    var courseId = course.id;
                    console.debug("course ID: " + courseId);
                    await self.syncTopics(courseId);
                    var courseRecord = {
                        fields: {
                            'CourseId': parseInt(course.id),
                            'Course': course.name,
                            'Section': course.section,
                            'DescriptionHeading': course.descriptionHeading,
                            'Description': course.description,
                            'Room': course.room,
                            'CourseState': { name: courseStateType[course.courseState] },
                            'Link to Class': course.alternateLink
                        }
                    };
                    var existingRecord = await query.records.find(record => record.getCellValue("CourseId") === courseRecord.fields.CourseId);
                    if (typeof (existingRecord) === typeof (undefined)) {
                        console.debug("record doesn't exist yet");
                        newCourseList.push(courseRecord);
                    }
                    else {
                        console.debug("record already exists");

                        if (self.recordsAreNotEqual(tableType.COURSE, existingRecord, courseRecord)) {
                            console.debug("at least one field is different");
                            courseRecord.id = existingRecord.id;
                            console.debug("courseRecord: " + JSON.stringify(courseRecord));
                            updateCourseList.push(courseRecord);
                        }
                        else {
                            console.debug("courses are equal");
                        }
                    }
                    courseIds[courseRecord.fields.CourseId] = courseRecord.fields.Course;
                    await self.getAssignments(courseId).then(async function () {
                        await self.delayAsync(50);
                    });
                });
                await query.unloadData();
            }
            else {
                console.debug("no courses found");
            }
            console.debug("newCourseList created: " + JSON.stringify(newCourseList));
            await self.syncTableRecords(newCourseList, updateCourseList, courseTable);
        });
    }

    async asyncForEach(array, callback) {
        for (let i = 0; i < array.length; i++) {
            await callback(array[i], i, array);
        }
    }
    /**
    * Print the names of the first 10 assignments the user has access to. If
    * no courses are found an appropriate message is printed.
    */
    async getAssignments(id) {
        var self = this;
        console.debug("calling createTableIfNotExists from getAssignments");
        var assignmentTable = await self.createTableIfNotExists(tableType.ASSIGNMENT);
        const newAssignmentList = [];
        const updateAssignmentList = [];
        var response = await gapi.client.classroom.courses.courseWork.list({
            courseId: id
        });//.then(async function (response) {
        var assignments = response.result.courseWork;
        const query = await assignmentTable.selectRecordsAsync();
        if (assignments.length > 0) {
            await self.asyncForEach(assignments, async (assignment) => {
                var materials = assignment.materials;
                await self.syncMaterials(materials, assignment.id);
                var topicName = self.getTopicNameFromId(assignment.topicId);
                if (assignment.dueDate) {
                    var dueDateTime = new Date(Date.UTC(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day, assignment.dueTime.hours, assignment.dueTime.minutes, 0, 0));
                }
                var studentSubmissions = await gapi.client.classroom.courses.courseWork.studentSubmissions.list({
                    courseId: id,
                    courseWorkId: assignment.id
                });
                var submissionEntries = studentSubmissions.result ? studentSubmissions.result.studentSubmissions : null;
                var submittedStatus = submissionEntries ? submittedStatusType[submissionEntries[0].state] : false;

                console.debug("student submissions: " + JSON.stringify(submissionEntries));
                console.debug("Submitted: " + submittedStatus);
                var assignmentRecord = {
                    fields: {
                        'AssignmentId': parseInt(assignment.id),
                        'Assignment': assignment.title,
                        'Description': assignment.description,
                        'Course': self.getCourseNameFromId(id),
                        'Topic': topicName,
                        'Link': assignment.alternateLink,
                        'Points': assignment.maxPoints,
                        'Updated': assignment.updateTime,
                        'Submitted': submittedStatus,
                        'Due': assignment.dueDate ? dueDateTime.toISOString() : null
                    }
                };
                var existingRecord = query.records.find(record => record.getCellValue('AssignmentId') === assignmentRecord.fields.AssignmentId);
                if (typeof (existingRecord) === typeof (undefined)) {
                    console.debug("assignment record doesn't exist yet");
                    newAssignmentList.push(assignmentRecord);
                }
                else {
                    console.debug("assignment record already exists");
                    if (self.recordsAreNotEqual(tableType.ASSIGNMENT, existingRecord, assignmentRecord)) {
                        console.debug("at least one field is different");
                        assignmentRecord.id = existingRecord.id;
                        updateAssignmentList.push(assignmentRecord);
                    }
                    else {
                        console.debug("assignments are equal");
                    }
                }
            })
        }
        else {
            console.debug('No assignments found.');
        }
        query.unloadData();
        await self.syncTableRecords(newAssignmentList, updateAssignmentList, assignmentTable);
    }

    getTopicNameFromId(topicId) {
        console.debug("topicIds: " + JSON.stringify(topicIds));
        console.debug("topic from id: " + topicIds[topicId]);
        return topicIds[topicId];
    }

    getCourseNameFromId(courseId) {
        console.debug("get coursename from id: " + courseId);
        console.debug("courseIds: " + JSON.stringify(courseIds));
        return courseIds[courseId];
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
            <Fragment>
                {this.state.isUpdateInProgress || !isLoggedIn ? (
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
                        {this.state.isUpdateInProgress ? (<Loader />) : (
                            <Button
                                variant="primary"
                                onClick={this.handleAuthClick}
                                marginBottom={3}
                                id="authorize_button"
                                style={isLoggedIn ? { display: "none" } : { display: "block" }}
                            >Connect and Sync with Google Classroom</Button>)}
                    </Box>
                ) : (
                        <Fragment>
                            {(this.state.lastSynced != null) ?
                                <Box display="flex"
                                    padding="5% 5% 0 5%"
                                    alignContent="flex-end"
                                    justifyContent="flex-end"
                                >
                                    <div>Last Synced: {this.state.lastSynced} </div>
                                </Box>
                                : (<></>)}
                            <Box
                                display="flex"
                                margin="1% 5% 0 5%">
                                <ViewPicker
                                    table={this.props.assignmentTable}
                                    view={this.props.assignmentView}
                                    onChange={(newView) => {
                                        this.props.setAssignmentView(newView);
                                    }}
                                    width="33%"
                                />
                                <Box
                                    display="flex"
                                    alignContent="flex-end"
                                    justifyContent="flex-end"
                                    width="100%"
                                >
                                    <Tooltip
                                        content="Get Assignments from Google Classroom"
                                        placementX={Tooltip.placements.RIGHT}
                                        placementY={Tooltip.placements.BOTTOM}
                                        style={isLoggedIn ? { display: "flex" } : { display: "none" }}
                                    >
                                        <Button
                                            variant="secondary"
                                            icon="redo"
                                            aria-label="Get Assignments from Google Classroom"
                                            onClick={this.syncWithGoogleClassroom} />
                                    </Tooltip>
                                    <Tooltip
                                        content="Sign Out of Google Classroom"
                                        placementX={Tooltip.placements.RIGHT}
                                        placementY={Tooltip.placements.BOTTOM}
                                        style={isLoggedIn ? { display: "flex" } : { display: "none" }}
                                    >
                                        <Button
                                            variant="secondary"
                                            onClick={this.handleSignoutClick}
                                            marginBottom={3}
                                            id="signout_button"
                                        >Sign Out</Button>
                                    </Tooltip>
                                </Box>
                            </Box>

                            <div style={{ marginRight: "2%" }}>
                                <br></br>
                                <Box>
                                    {(this.props.assignments != null) ? (<ShowAssignments style={isLoggedIn ? { display: "block" } : { display: "none" }} assignmentRecords={this.props.assignments} materialRecords={this.props.materials} />) : (<></>)}
                                </Box>
                                <br></br>
                            </div>
                        </Fragment>
                    )}
            </Fragment>
        );
    }
}

String.prototype.toAmPmString = function () {
    var ampm = "am";
    var hoursRegex = /^([0-9]+):/;
    var secondsRegex = /^([0-9]+:[0-9]+)(:[0-9]+)/;
    var hours = parseInt(this.match(hoursRegex)[0]);
    console.debug("hours: " + hours);
    if (hours > 12 && hours < 24) {
        hours = hours - 12;
        ampm = "pm";
    }
    if (hours == 24) {
        hours = 12;
        ampm = "am";
    }
    return (this.replace(hoursRegex, hours + ":").replace(secondsRegex, "$1") + " " + ampm);
};