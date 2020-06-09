import {initializeBlock, useBase} from '@airtable/blocks/ui';
import React from 'react';

function HelloWorldBlock() {
    // YOUR CODE GOES HERE
    const curBase = useBase();
    return <div>Your Base: {curBase.name}</div>
}

initializeBlock(() => <HelloWorldBlock />);
