import React, { useState, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Text,
    Heading,
    Button,
    FormField,
    Input,
    Link,
    useSettingsButton,
} from '@airtable/blocks/ui';

/**
 * The settings form allows the user to configure the right table, view and fields for the game.
 */
export default function SettingsForm({onDone, originUrl}) {
    // Use the `useSettings` hook to access the settings, and re-render whenever something changes.
    const [clientId, setClientId] = useState("");
    useSettingsButton(onDone);
    return (
        <Fragment>
            <Box display="flex" flexDirection="column" position="absolute" top={0} bottom={0} left={0} right={0}>
            <Box flex="auto" padding={4} paddingBottom={2}>
                <Heading marginBottom={3}>Settings</Heading>
                <EnableApisInfo></EnableApisInfo>
                <AuthCredentialsInfo url={originUrl}></AuthCredentialsInfo>
                <FormField label="Enter Client ID:">
                    <Input value={clientId} onChange={e => setClientId(e.target.value)} />
                </FormField>
            </Box>
            <Box display="flex" flex="none" padding={3} borderTop="thick">
                <Button onClick={() => {
                onDone(clientId);
                }} size="large" variant="primary">
                        Done
                </Button>
            </Box>
        </Box>
        </Fragment>
    );
}

function EnableApisInfo(){
    return(
        <Fragment>
            <Heading>Enable Google APIs to use this Airtable Block</Heading>
            <p>To enable the API:</p>
            <ol>
                <li><Link href="https://console.developers.google.com/apis/library" target="_blank">Open the API Library</Link> in the
                Google API Console.</li>
                <li>If prompted, select a project, or create a new one.</li>
                <li>The API Library lists all available APIs, grouped by product
                family and popularity. If the API you want to enable isn't visible in the list, use search to
                find it, or click <b>View All</b> in the product family it belongs to.</li>
                <li>Select the API you want to enable, then click the <b>Enable</b> button.</li>
                <li>If prompted, enable billing.</li>
                <li>If prompted, read and accept the API&#39;s Terms of Service.</li>
            </ol>
        </Fragment>
    );
}

function AuthCredentialsInfo({url}){
    return(
    <Fragment>
        <Heading>Create authorization credentials</Heading>
        <p>These credentials will allow you to login to your Google Classroom account with this block.</p>
        <ol>
            <li>Go to the <Link href="https://console.developers.google.com/apis/credentials" target="_blank">Credentials page</Link>.</li>
            <li>Click <b>Create credentials > OAuth client ID</b>.</li>
            <li>Select the <b>Web application</b> application type.</li>
            <li>Complete the form.
                <ul>
                    <li>Under <b>"Authorized JavaScript origins,"</b> Click <b>"Add URI"</b> and enter:<br></br> {url}</li>
                </ul>
            </li>
            <li>Submit the form and copy the Client ID (to enter below):</li>
        </ol>
        </Fragment>
    );
}

SettingsForm.propTypes = {
    onDone: PropTypes.func.isRequired,
    originUrl: PropTypes.string.isRequired
};