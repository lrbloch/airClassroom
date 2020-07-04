import React, { Fragment } from 'react';
import { Box, Heading, Icon } from "@airtable/blocks/ui";
import moment from 'moment';
moment().format();

/** @enum {string} */
export const assignmentDueTypes = {
  OVERDUE: "Overdue",
  TODAY: "Due Today",
  UPCOMING: "Upcoming"
}

function ShowIndividualAssignment({record, onClick}){
  return (
    <Fragment>
      <br></br>
      <Box margin={2} padding={3} border="thick" borderRadius={5} overflow="auto">
        <a
          style={{cursor: 'pointer', flex: 'auto', padding: 8, alignSelf: 'right'}}
          onClick={() => {
              onClick(record);
          }}>
            <Icon name="x" size={16} style={{float:"right", color:"gray"}} />
        </a>
        <br></br>
        <Heading>{record.getCellValue("Assignment")}</Heading>
      </Box>
    </Fragment>
  );
}

function DisplayAssignmentHeaders({records, onClick, toggleShow, showHide, assignmentDue}){
  const recordsDisplay = filterRecords(records, onClick, assignmentDue);
  return (
    <Fragment>
      <th style={{width:"33%"}}>
        <br></br>
        <a
        style={{cursor: 'pointer', flex: 'auto', padding: 8}}
        onClick={() => {
          toggleShow(assignmentDue);
        }}>
          <Heading> {assignmentDue} ({recordsDisplay ? recordsDisplay.length : "0"})
            {recordsDisplay ? (
            <Icon name={showHide ? "chevronUp" : "chevronDown"} size={20} />) : (<></>)}
          </Heading> 
        </a>
      </th>
    </Fragment>
  );
}

function DisplayAssignmentList({records, onClick, showHide, assignmentDue}){
  const recordsDisplay = filterRecords(records, onClick, assignmentDue);
  return <td style={{width:"33%"}}>
    {showHide && recordsDisplay != null ?
      (
          <Box position="relative" height="200px" overflow="auto">
            {recordsDisplay}
          </Box>
      )
      : (<></>) } 
    </td>
}

function filterRecords(records, onClick, category) {
  var now = moment();
  var filteredRecords;
  switch(category){
    case assignmentDueTypes.OVERDUE:
      filteredRecords = _.filter(records, function (record) {
        return moment(record.getCellValue("Due")).isBefore(now, 'day');
      });
      break;
    case assignmentDueTypes.TODAY:
      filteredRecords = _.filter(records, function(record){
        return moment(record.getCellValue("Due")).isSame(moment(), 'day');
      });
      break;
    case assignmentDueTypes.UPCOMING:
      filteredRecords = _.filter(records, function(record){
        return moment(record.getCellValue("Due")).isAfter(moment(), 'day');
      });
      break;
    default:
      console.error("no type for " + category);
      return null;
  }

  const recordsDisplay = (filteredRecords !=null && filteredRecords.length > 0) ? filteredRecords.map((record, index) => {
    return (
      <Box
        // fontSize={4}
        paddingX={3}
        paddingY={2}
        margin={1}
        borderBottom="default"
        display="flex"
        alignItems="center"
        overflowY="auto"
        key={index}
        border="thick"
        width="inherit"
    ><a
      style={{cursor: 'pointer', flex: 'auto', padding: 8}}
      onClick={() => {
          onClick(record);
      }}
      >
      {record.primaryCellValueAsString || 'Untitled Assignment'}
      <br></br>
      {(category != assignmentDueTypes.TODAY) ? 
      (moment(record.getCellValue("Due")).format("MMM D")) 
        : (<></>)}
    </a></Box>)
  }) : null;

  return recordsDisplay;

}

export class ShowAssignments extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showLists: true,
      showOverdueList: false,
      showTodayList: false,
      showUpcomingList: false,
      showIndividualAssignment: false,
      selectedAssignment: null
    };
    this.showHideAssignment = this.showHideAssignment.bind(this);
    this.toggleShow = this.toggleShow.bind(this);
  }

  render() {
    return (
      <>
        {this.state.showLists ? (
          <table style={{width:"100%"}}>
            <tbody>
            <tr>
              <DisplayAssignmentHeaders records={this.props.assignmentRecords} onClick={this.showHideAssignment} toggleShow={this.toggleShow} showHide={this.state.showOverdueList} assignmentDue={assignmentDueTypes.OVERDUE}/>
              
              <DisplayAssignmentHeaders records={this.props.assignmentRecords} onClick={this.showHideAssignment} toggleShow={this.toggleShow} showHide={this.state.showTodayList} assignmentDue={assignmentDueTypes.TODAY}/>
              
              <DisplayAssignmentHeaders records={this.props.assignmentRecords} onClick={this.showHideAssignment} toggleShow={this.toggleShow} showHide={this.state.showUpcomingList} assignmentDue={assignmentDueTypes.UPCOMING}/>
            </tr>
            <tr>
              <DisplayAssignmentList records={this.props.assignmentRecords} onClick={this.showHideAssignment} showHide={this.state.showOverdueList} assignmentDue={assignmentDueTypes.OVERDUE}/>
              
              <DisplayAssignmentList records={this.props.assignmentRecords} onClick={this.showHideAssignment} showHide={this.state.showTodayList} assignmentDue={assignmentDueTypes.TODAY}/>
              
              <DisplayAssignmentList records={this.props.assignmentRecords} onClick={this.showHideAssignment} showHide={this.state.showUpcomingList} assignmentDue={assignmentDueTypes.UPCOMING}/>
            </tr>
            </tbody>
          </table>
        ) : (<></>)}
        {this.state.showIndividualAssignment ? (
          <ShowIndividualAssignment record={this.state.selectedAssignment} onClick={this.showHideAssignment}/>
        ) : (<></>)}
      </>
    );
  }

  showHideAssignment(record){
    console.log("SHOW Assignment: " + record);
    if(!this.state.showIndividualAssignment){
      this.setState({'showLists': false});
      this.setState({'showIndividualAssignment': true});
      this.setState({'selectedAssignment': record})
    }
    else{
      this.setState({'showLists': true});
      this.setState({'showIndividualAssignment': false});
      this.setState({'selectedAssignment': null})
    }
  }

  toggleShow(type){
    switch(type){
      case assignmentDueTypes.TODAY:
        this.setState({'showTodayList': !this.state.showTodayList});
        break;
      case assignmentDueTypes.OVERDUE:
        this.setState({'showOverdueList': !this.state.showOverdueList});
        break;
      case assignmentDueTypes.UPCOMING:
        this.setState({'showUpcomingList': !this.state.showUpcomingList});
        break;
      default:
        console.error("No type for " + type);
        break;
    }
  }
}

export default ShowAssignments;