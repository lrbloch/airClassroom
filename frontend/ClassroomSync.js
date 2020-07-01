import { Loader, Button } from '@airtable/blocks/ui';
import React, { Fragment } from 'react';
import { FieldType } from '@airtable/blocks/models';
import ShowAssignments from './ShowAssignments';
import { GOOGLE_API_ENDPOINT, CLIENT_ID, DISCOVERY_DOCS, SCOPES, MAX_RECORDS_PER_UPDATE } from './index';

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

var topicIds = {};

export class ClassroomSync extends React.Component {


    constructor(props) {
        super(props);
        this.state = {
            status: 'start',
            isLoggedIn: props.isLoggedIn,
            isUpdateInProgress: false,
            lastSynced: null,
            assignmentRecords: props.assignments
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
            self.syncWithGoogleClassroom();
        }, function (error) {
            alert(JSON.stringify(error, null, 2));
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

    async syncMaterials(newMaterials, assignmentId) {
        var self = this;
        var materialTable = await this.createTableIfNotExists(tableType.MATERIAL);
        const newMaterialList = [];
        const updateMaterialList = [];
        const query = await materialTable.selectRecordsAsync();
        if (newMaterials?.length > 0) {
            await self.asyncForEach(newMaterials, async (material) => {
                var materialType = material.link ? "Link" : material.driveFile ? "Drive File" : material.youtubeVideo ? "YouTube Video" : "Other";
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
                                'Link': material.link.url,
                                'Image': [{
                                    url: material.link.thumbnailUrl.replace("https://classroom.google.com/webthumbnail?url=", ""),
                                }],
                                'MaterialType': { name: materialType },
                                'AssignmentId': parseInt(assignmentId)
                            }
                        }
                        console.log("Thumbnail URL: " + material.link.thumbnailUrl);
                        console.log("Stored Image url: " + materialRecord.fields.Image[0].url);
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
                        materialRecord = {
                            fields: {
                                'Material': material.driveFile.driveFile.title ? material.driveFile.driveFile.title : "Untitled File",
                                'Link': material.driveFile.driveFile.alternateLink,
                                'Image': [{
                                    url: material.driveFile.driveFile.alternateLink,
                                }],
                                'MaterialType': { name: materialType },
                                'AssignmentId': parseInt(assignmentId)
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
                    case "Other":
                    default:
                        console.error(`no matching type for this material: ${JSON.stringify(material)}`);
                        return;
                }

                var existingRecord = await query.records.find(record => record.getCellValue("Material") === materialRecord.fields.Material);
                if (typeof (existingRecord) === typeof (undefined)) {
                    console.log("material record doesn't exist yet");
                    newMaterialList.push(materialRecord);
                }
                else {
                    console.log("material record already exists");

                    if (self.recordsAreNotEqual(tableType.MATERIAL, existingRecord, materialRecord)) {
                        console.log("at least one field is different");
                        materialRecord.id = existingRecord.id;
                        updateMaterialList.push(materialRecord);
                    }
                    else {
                        console.log("materials are equal");
                    }
                }
            });
            await query.unloadData();
        }
        else {
            console.log("no materials found");
        }
        console.log("newMaterials created: " + JSON.stringify(newMaterialList));
        await self.syncTableRecords(newMaterialList, updateMaterialList, materialTable);
    }

    async syncTopics(id) {
        var self = this;
        await gapi.client.classroom.courses.topics.list({
            courseId: id
        }).then(async function (response) {
            var topics = response.result.topic;
            console.log("syncing topics: " + JSON.stringify(topics));
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
                                console.log("topic record doesn't exist yet");
                                newTopicList.push(topicRecord);
                            }
                            else {
                                console.log("topic record already exists");

                                if (self.recordsAreNotEqual(tableType.TOPIC, existingRecord, topicRecord)) {
                                    console.log("at least one field is different");
                                    topicRecord.id = existingRecord.id;
                                    updateTopicList.push(topicRecord);
                                }
                                else {
                                    console.log("topics are equal");
                                }
                            }
                            topicIds[topicRecord.fields.TopicId] = topicRecord.fields.Topic;
                        });
                        await query.unloadData();
                    }
                    else {
                        console.log("no topics found");
                    }
                    console.log("newTopics created: " + JSON.stringify(newTopicList));
                    await self.syncTableRecords(newTopicList, updateTopicList, topicTable);
                });
            });
        });
    }

    //TODO: Add update in case fields of old table don't match these fields
    async createTableIfNotExists(tableName) {
        console.log("Creating Table, tableName: " + tableName);
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
                            { name: 'Materials', type: FieldType.SINGLE_LINE_TEXT },
                            {
                                name: 'CourseId', type: FieldType.NUMBER, options: { precision: 0 }
                            },
                            { name: 'Topic', type: FieldType.SINGLE_LINE_TEXT },
                            { name: 'Link', type: FieldType.URL },
                            { name: 'Points', type: FieldType.NUMBER, options: { precision: 0 } },
                            { name: 'Updated', type: FieldType.SINGLE_LINE_TEXT },
                            { name: 'Due', type: FieldType.DATE_TIME, options: 
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
                            }
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
            console.log(`creating ${tableName} table`);
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
                    || (existingRecord.getCellValue("CourseId") != compareRecord.fields.CourseId)
                    || (existingRecord.getCellValue("Link") != compareRecord.fields.Link)
                    || (existingRecord.getCellValue("Points") != compareRecord.fields.Points)
                    || (existingRecord.getCellValue("Updated") != compareRecord.fields.Updated)
                    || (existingRecord.getCellValue("Due") != compareRecord.fields.DescriptionHeading));
            case tableType.MATERIAL:
                return ((existingRecord.getCellValue("Material") != compareRecord.fields.Material)
                    || (existingRecord.getCellValue("Link") != compareRecord.fields.Link)
                    || (existingRecord.getCellValue("Image").url != compareRecord.fields.Image.url)
                    || (existingRecord.getCellValue("MaterialType") != compareRecord.fields.MaterialType));
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
        console.log("calling createTableIfNotExists from getCourses");
        await self.createTableIfNotExists(tableType.COURSE).then(async function (courseTable) {
            const newCourseList = [];
            const updateCourseList = [];
            var response = await gapi.client.classroom.courses.list();
            var courses = response.result.courses;
            const query = await courseTable.selectRecordsAsync();
            if (courses?.length > 0) {
                await self.asyncForEach(courses, async (course) => {
                    var courseId = course.id;
                    console.log("course ID: " + courseId);
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
                    await self.getAssignments(courseId).then(async function () {
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
        console.log("calling createTableIfNotExists from getAssignments");
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
                console.log("topicName: " + topicName);
                if(assignment.dueDate)
                {
                    var dueDateTime = new Date(Date.UTC(assignment.dueDate.year, assignment.dueDate.month-1, assignment.dueDate.day, assignment.dueTime.hours, assignment.dueTime.minutes, 0, 0));
                }
                var assignmentRecord = {
                    fields: {
                        'AssignmentId': parseInt(assignment.id),
                        'Assignment': assignment.title,
                        'Description': assignment.description,
                        'CourseId': parseInt(id),
                        'Topic': topicName,
                        'Link': assignment.alternateLink,
                        'Points': assignment.maxPoints,
                        'Updated': assignment.updateTime,
                        'Due': assignment.dueDate ? dueDateTime.toISOString() : null
                    }
                };
                var existingRecord = query.records.find(record => record.getCellValue('AssignmentId') === assignmentRecord.fields.AssignmentId);
                if (typeof (existingRecord) === typeof (undefined)) {
                    console.log("assignment record doesn't exist yet");
                    newAssignmentList.push(assignmentRecord);
                }
                else {
                    console.log("assignment record already exists");
                    if (self.recordsAreNotEqual(tableType.ASSIGNMENT, existingRecord, assignmentRecord)) {
                        console.log("at least one field is different");
                        assignmentRecord.id = existingRecord.id;
                        updateAssignmentList.push(assignmentRecord);
                    }
                    else {
                        console.log("assignments are equal");
                    }
                }
            })
        }
        else {
            console.log('No assignments found.');
        }
        query.unloadData();
        await self.syncTableRecords(newAssignmentList, updateAssignmentList, assignmentTable);
        const newQuery = await assignmentTable.selectRecordsAsync();
        var allAssignments = await newQuery.records;
        console.log("allAssignments: " + allAssignments);
        this.setState({ 'assignmentRecords': allAssignments });
        newQuery.unloadData();
    }

    getTopicNameFromId(topicId) {
        console.log("topicIds: " + JSON.stringify(topicIds));
        console.log("topic from id: " + topicIds[topicId]);
        return topicIds[topicId];
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
            <>
                {this.state.isUpdateInProgress ? (
                    <Loader />
                ) : (
                        <Fragment>
                            {(this.state.assignmentRecords != null) ? (<ShowAssignments style={isLoggedIn ? { display: "block" } : { display: "none" }} assignmentRecords={this.state.assignmentRecords} />) : (<></>)}
                            
                            {(this.state.lastSynced != null && this.state.isLoggedIn) ?
                                (<div>Last Synced: {this.state.lastSynced} </div>) : (<></>)}
                            <br></br>
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