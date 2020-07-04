
import { initializeBlock, useBase, useRecords, Box } from '@airtable/blocks/ui';
import React, { useState } from 'react';
import { ClassroomSync } from './ClassroomSync';
import { tableType } from './ClassroomSync';
const credentials = require('../../../../../credentials.json')

// These values match the base for this example: https://airtable.com/shrIho8SB7RhrlUQL
const TABLE_NAME = 'Table 1';
export const COURSE_TABLE_NAME = 'Courses';
// const TITLE_FIELD_NAME = 'Courses';

// Airtable SDK limit: we can only update 50 records at a time. For more details, see
// https://github.com/Airtable/blocks/blob/master/packages/sdk/docs/guide_writes.md#size-limits--rate-limits
export const MAX_RECORDS_PER_UPDATE = 50;
export const GOOGLE_API_ENDPOINT = "https://apis.google.com/js/api.js";
//   // Client ID from the Developer Console
export var CLIENT_ID = credentials.CLIENT_ID;

//   // Array of API discovery doc URLs for APIs used by the quickstart
export var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/classroom/v1/rest"];

//   // Authorization scopes required by the API; multiple scopes can be
//   // included, separated by spaces.
export var SCOPES = 
    //"https://www.googleapis.com/auth/classroom.coursework.students " + 
    "https://www.googleapis.com/auth/classroom.coursework.me " +
    "https://www.googleapis.com/auth/classroom.topics";

function AirClassroomBlock() {
    const base = useBase();
    const table = base.getTableByName(TABLE_NAME);
    const records = useRecords(table);
    const assignmentTable = base.getTableByNameIfExists(tableType.ASSIGNMENT);
    const opts = {
        sorts: [
            {field: "Due", direction: 'asc'}
        ]
    }
    const assignments = useRecords(assignmentTable, opts);

    return (
        <ClassroomSync base={base} assignments={assignments}/>
    );
}

initializeBlock(() => <AirClassroomBlock />);

