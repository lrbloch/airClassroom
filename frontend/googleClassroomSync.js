import { courses, topics, assignments } from './index';
import {FieldType} from '@airtable/blocks/models';

/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
export function appendPre(message) {
    var pre = document.getElementById('content');
    var textContent = document.createTextNode(message + '\n');
    pre.appendChild(textContent);
}
/**
 * Clear the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 */
export function clearBody() {
    var pre = document.getElementById('content');
    var pre = document.getElementById('content');
    pre.innerHTML = '';
}
/**
 * Print the names of the first 10 courses the user has access to. If
 * no courses are found an appropriate message is printed.
 */
export function listCourses() {
    gapi.client.classroom.courses.list().then(function (response) {
        var courses = response.result.courses;
        appendPre('Courses:');

        if (courses.length > 0) {
            for (var i = 0; i < courses.length; i++) {
                var course = courses[i];
                appendPre(course.name);
                var courseId = course.id;
                courses.push(course);
                listCourseWork(courseId);
                listCourseTopics(courseId);
            }
        }
        else {
            appendPre('No courses found.');
        }
    });

    //write courses to database
    createOrUpdateCourseTable(courses);
}

async function createOrUpdateCourseTable(courses) {
    const name = 'Courses';
    const fields = [
        // Name will be the primary field of the table.
        { name: 'Course Name', type: FieldType.SINGLE_LINE_TEXT },
        { name: 'CourseId', type: FieldType.SINGLE_LINE_TEXT },
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
        { name: 'alternateLink', type: FieldType.URL },
    ];
    if (base.unstable_hasPermissionToCreateTable(name, fields)) {
        await base.unstable_createTableAsync(name, fields);
    }
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
