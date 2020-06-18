// async function createOrUpdateCourseTable(courses) {
//     const name = 'Courses';
//     const fields = [
//         // Name will be the primary field of the table.
//         { name: 'Course Name', type: FieldType.SINGLE_LINE_TEXT },
//         { name: 'CourseId', type: FieldType.SINGLE_LINE_TEXT },
//         { name: 'Section', type: FieldType.SINGLE_LINE_TEXT },
//         { name: 'DescriptionHeading', type: FieldType.SINGLE_LINE_TEXT },
//         { name: 'Description', type: FieldType.SINGLE_LINE_TEXT },
//         { name: 'Room', type: FieldType.SINGLE_LINE_TEXT },
//         {
//             name: 'CourseState', type: FieldType.SINGLE_SELECT, options: {
//                 choices: [
//                     { name: "COURSE_STATE_UNSPECIFIED" },
//                     { name: "ACTIVE" },
//                     { name: "ARCHIVED" },
//                     { name: "PROVISIONED" },
//                     { name: "DECLINED" },
//                     { name: "SUSPENDED" }
//                 ]
//             }
//         },
//         { name: 'alternateLink', type: FieldType.URL },
//     ];
//     // const base = useBase();
//     // if (base.unstable_hasPermissionToCreateTable(name, fields)) {
//     //     await base.unstable_createTableAsync(name, fields);
//     // }
// }

