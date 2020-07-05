# AirClassroom

AirClassroom is an Airtable Block that integrates with Google Classroom for easier management of assignments and course content for students and parents.

## Inspiration
When working with teachers in New York City public schools, I found that one of the biggest challenges facing students and parents in remote learning was simply understanding what was expected of them each day. All of the public schools in NYC implemented Google Classroom to manage their remote learning during Coronavirus. Within Google Classroom, students and parents can access the work assigned to them, but it is not always clear where to begin, or what to do after finishing one assignment. Additionally, the assignments are grouped by course so there is no easy way to see all assignments across courses.

## What it does
This block pulls courses, assignments, and materials from Google Classroom into a user's base, providing an overview of their overdue and upcoming assignments. From within the block, users can navigate through their coursework and view their course materials.

## How I built it
This block is built using React.js with the Airtable Blocks SDK and Google Classroom REST API. The ClassroomSync Component is responsible for authenticating with Google and reading data from Google Classroom into the Airtable base. The ShowAssignments Component compiles the data from the Airtable base into the Block to be displayed for the user.

## Challenges I ran into
It was difficult to build in the authentication process for Google Classroom's API, as it involves loading the API before use. Additionally, being new to React, I had to work through a lot of issues with using hooks: I didn't immediately know that hooks can only be used within function components. This caused me to refactor my code in a new way so that I could pass data as props.

## Accomplishments that I'm proud of
* Determining how to authenticate with Google within an Airtable Block
* Identifying interesting ways to use Airtable UI components
* "Flattening" certain JSON objects into a more exchangeable format (allowing Materials to be of multiple types)

## What I learned
* A lot about synchronous and asynchronous events in Javascript (hint: don't forget to "await" asynchronous calls!)
* 

## What's next for AirClassroom
* Allow students to submit assignments from within Block
* "Teacher" view for creating new assignments and setting the order in which they should be completed
* "Parent" view to aggregate all their children's assignments
* Synchronous class events: e.g. notify user when it is time to attend a scheduled Google Meet
* Integrate with other LMS (Canvas, Blackboard, etc.)