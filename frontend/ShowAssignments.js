import React, { Fragment } from 'react';
import { Box, Link, Heading, Icon, Text } from "@airtable/blocks/ui";
import moment from 'moment';
moment().format();

/** @enum {string} */
export const assignmentDueTypes = {
  OVERDUE: "Overdue",
  TODAY: "Due Today",
  UPCOMING: "Upcoming"
}

function ShowIndividualAssignment({record, materials, onClick}){
  var materials = getMaterialsForAssignment(record.getCellValue("AssignmentId"), materials);
  var points = record.getCellValue("Points");
  return (
    <Fragment>
      <br></br>
      <Box width="100%" margin={2} padding={3} border="thick" borderRadius={5} overflowY="auto">
        <Box>
          <a
            style={{cursor: 'pointer', flex: 'auto', padding: 8, alignSelf: 'right'}}
            onClick={() => {
                onClick(record);
            }}>
              <Icon name="x" size={16} style={{float:"right", color:"gray"}} />
          </a>
          <br></br>
          <Box
            display="flex"
            // alignItems="right"
            justifyContent="right"
            flexDirection="column"
            width="100%"
            flex="auto"
            >
            {points ? (<Text size="xlarge" style={{alignSelf:"flex-end"}}>Points: {points}</Text>) : (<></>)}
            
            <Link
              href={record.getCellValue("Link")}
              target="_blank"
              style={{alignSelf:"flex-end"}}
              icon="hyperlink"
            >
              View in Google Classroom
            </Link>
          </Box>
        </Box>
        <Heading>{record.getCellValue("Course")} | {record.getCellValue("Topic")}</Heading>
        <Heading>{record.getCellValue("Assignment")}{record.getCellValue("Submitted") === true ? " (Complete)" : ""}</Heading>
        <Text>{record.getCellValue("Description")}</Text>
        <br></br>
        <br></br>
        {materials ? (<Heading>Materials</Heading>) : (<></>)}
        <>{materials}</>
      </Box>
    </Fragment>
  );
}

function getMaterialsForAssignment(assignmentId, materialsList){
  var filteredRecords = _.filter(materialsList, function (material) {
    //only show assignments that haven't been turned in yet and are overdue
    return material.getCellValue("AssignmentId") === assignmentId;
  });

  const materialsDisplay = (filteredRecords !=null && filteredRecords.length > 0) ? filteredRecords.map((record, index) => {
    var type = record.getCellValue("MaterialType").name;
    var embedUrl = record.getCellValue("Link");
    if(type === "YouTube Video") {
      embedUrl = getYoutubePreviewUrl(embedUrl);
    }
    return (
      <Box
        alignItems="center"
        overflowY="auto"
        key={index}
        width="inherit"
      >
      {/* TODO: Figure out how to make this toggle the materials */}
      {/* <a
      style={{cursor: 'pointer', flex: 'auto', padding: 8}}
      onClick={() => {
        showMaterial = !showMaterial;
        console.log("showMaterial: " + showMaterial);
      }}> */}
      <Text>
        {record.primaryCellValueAsString || 'Untitled Material'}
      </Text>
      <br></br>
      {(type === "Drive File" || type === "YouTube Video" || type ===  "Form") && (embedUrl != "") ?
        (
          // this feature was adapted from the opensource code for blocks-url-preview
          // see https://github.com/Airtable/blocks-url-preview for more
        <iframe
          // Using `key=embedUrl` will immediately unmount the
          // old iframe when we're switching to a new
          // preview. Otherwise, the old iframe would be reused,
          // and the old preview would stay onscreen while the new
          // one was loading, which would be a confusing user
          // experience.
          key={embedUrl}
          style={{flex: 'auto', width:'100%', height:'500px'}}
          src={embedUrl}
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
      />) : (<></>)
      }
      
      {/* </a> */}

      <br></br>
    </Box>)
  }) : null;
  return materialsDisplay;
}


// this function was copied from the opensource code for blocks-url-preview
// see https://github.com/Airtable/blocks-url-preview for more
function getYoutubePreviewUrl(url) {
  // Standard youtube urls, e.g. https://www.youtube.com/watch?v=KYz2wyBy3kc
  let match = url.match(/youtube\.com\/.*v=([\w-]+)(&|$)/);

  if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
  }

  // Shortened youtube urls, e.g. https://youtu.be/KYz2wyBy3kc
  match = url.match(/youtu\.be\/([\w-]+)(\?|$)/);
  if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
  }

  // Youtube playlist urls, e.g. youtube.com/playlist?list=KYz2wyBy3kc
  match = url.match(/youtube\.com\/playlist\?.*list=([\w-]+)(&|$)/);
  if (match) {
      return `https://www.youtube.com/embed/videoseries?list=${match[1]}`;
  }

  // URL isn't for a youtube video
  return null;
}

function DisplayAssignmentHeaders({records, onClick, toggleShow, showHide, assignmentDue}){
  const recordsDisplay = filterRecords(records, onClick, assignmentDue);
  return (
    <Fragment>
      <th style={{width:"33%"}}>
        <br></br>
        <a
        style={{cursor: (recordsDisplay ? 'pointer': ''), flex: 'auto', padding: 8}}
        onClick={() => {
          {recordsDisplay ? toggleShow(assignmentDue): ''};
        }}>
          <Heading as="h5" textColor={showHide ? "" : "light"}> {assignmentDue} ({recordsDisplay ? recordsDisplay.length : "0"})
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
        //only show assignments that haven't been turned in yet and are overdue
        return record.getCellValue("Submitted") != true && moment(record.getCellValue("Due")).isBefore(now, 'day');
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
    var countDueToday = _.filter(this.props.assignmentRecords.filteredRecords, function(record){
      return moment(record.getCellValue("Due")).isSame(moment(), 'day');
    }).length;

    return (
      <>
        {this.state.showLists ? (
          <Fragment>
            <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            width="100%">
              <Heading style={{textAlign:"center"}}>Today is {moment().format('dddd, MMMM D YYYY')}.<br/>
              You have {countDueToday} assignments due today.</Heading>
            </Box>
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
          </Fragment>
        ) : (<></>)}
        {this.state.showIndividualAssignment ? (
          <ShowIndividualAssignment record={this.state.selectedAssignment} materials={this.props.materialRecords}  onClick={this.showHideAssignment}/>
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