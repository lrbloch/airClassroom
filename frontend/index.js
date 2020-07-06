import { initializeBlock, useBase, useRecords, Box, useSession, useSettingsButton } from '@airtable/blocks/ui';
import React, { useState, Fragment } from 'react';
import { ClassroomSync } from './ClassroomSync';
import { tableType } from './ClassroomSync';
import SettingsForm from './SettingsForm';
import { globalConfig } from '@airtable/blocks';
const credentials = require('./credentials.json')

// Airtable SDK limit: we can only update 50 records at a time. For more details, see
// https://github.com/Airtable/blocks/blob/master/packages/sdk/docs/guide_writes.md#size-limits--rate-limits
export const MAX_RECORDS_PER_UPDATE = 50;
export const GOOGLE_API_ENDPOINT = "https://apis.google.com/js/api.js";

//   // Array of API discovery doc URLs for APIs used by the quickstart
export var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/classroom/v1/rest"];

//   Authorization scopes required by the API; multiple scopes can be
//   included, separated by spaces.
export var SCOPES =
    "https://www.googleapis.com/auth/classroom.coursework.me " +
    "https://www.googleapis.com/auth/classroom.topics";

function AirClassroomBlock() {
    const base = useBase();
    const assignmentTable = base.getTableByNameIfExists(tableType.ASSIGNMENT);
    const opts = {
        sorts: [
            { field: "Due", direction: 'asc' }
        ]
    }
    const [assignmentView, setAssignmentView] = useState(assignmentTable?.views[0]);
    const assignments = useRecords(assignmentView, opts);

    const materialsTable = base.getTableByNameIfExists(tableType.MATERIAL);
    const materials = useRecords(materialsTable);
    const session = useSession();
    var clientId = globalConfig.get(['CLIENT_ID']);
    const [isShowingSettings, setIsShowingSettings] = useState(clientId);
    // We are watching the settings here to make sure the settings are still valid for a new game.
    // If the settings are not valid we will ask the user to update the settings before playing a new game.
    // This could be because someone else changed the settings or because something in the schema changed.
    //const {isValid, settings} = useSettings();
    useSettingsButton(function() {
        setIsShowingSettings(!isShowingSettings);
    });

    function updateClientId(newClientId){
        clientId = newClientId;
        if (globalConfig.hasPermissionToSet('CLIENT_ID', clientId)) {
            globalConfig.setAsync('CLIENT_ID', clientId);
        }
        else{
            console.error("Can't set global configs!");
        }
        setIsShowingSettings(!isShowingSettings);
    }

    return (
        <Fragment>
            {isShowingSettings ? 
            (<Box>
                <SettingsForm onDone={updateClientId} originUrl={location.origin}/>
            </Box>)
            :
            (<Box>
                <ClassroomSync assignmentTable={assignmentTable} assignmentView={assignmentView} setAssignmentView={setAssignmentView} base={base} assignments={assignments} materials={materials} collaborator={session.currentUser.name}/>
            </Box>)}
        </Fragment>
    );

}

initializeBlock(() => <AirClassroomBlock />);

