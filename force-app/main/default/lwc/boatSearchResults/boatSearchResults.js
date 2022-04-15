import { LightningElement, wire, api} from 'lwc';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import {refreshApex} from '@salesforce/apex';
import updateBoatList from '@salesforce/apex/BoatDataService.updateBoatList';
import { publish,MessageContext } from 'lightning/messageService';
import BOATMC from "@salesforce/messageChannel/BoatMessageChannel__c";
const SUCCESS_TITLE = 'Success';
const MESSAGE_SHIP_IT     = 'Ship it!';
const SUCCESS_VARIANT     = 'success';
const ERROR_TITLE   = 'Error';
const ERROR_VARIANT = 'error';
export default class BoatSearchResults extends LightningElement {
  @api selectedBoatId;
  columns = [{label:'Name', fieldName:'Name',type:'text',editable:true},
            {label:'Length',fieldName:'Length__c',type:'number'},
            {label:"Price",fieldName:'Price__c',type:'Currency',typeAttributes:{currencyCode:'USD'}},
            {label:'Description',fieldName:'Description__c',type:'text'}
];
  boatTypeId = '';
  boats;
  isLoading = false;
  draftValues=[]
  
  // wired message context
  @wire(MessageContext)
  messageContext;
  // wired getBoats method 
  @wire(getBoats,{boatTypeId:'$boatTypeId'})
  wiredBoats(result) {
    this.boats = result;
  }
  
  // public function that updates the existing boatTypeId property
  // uses notifyLoading
  @api searchBoats(boatTypeId) { 
    this.isLoading = true;
    this.notifyLoading(this.isLoading);
    this.boatTypeId = boatTypeId;
  }
  
  // this public function must refresh the boats asynchronously
  // uses notifyLoading
  async refresh() {
    this.isLoading = true;
    this.notifyLoading(this.isLoading)
    await refreshApex(this.boats);
    this.isLoading = false;
    this.notifyLoading(this.isLoading)
  }
  
  // this function must update selectedBoatId and call sendMessageService
  updateSelectedTile(event) {
    this.selectedBoatId = event.detail.boatId;
    this.sendMessageService(this.selectedBoatId);
   }
  
  // Publishes the selected boat Id on the BoatMC.
  sendMessageService(boatId) { 
    // explicitly pass boatId to the parameter recordId
    const payload = {recordId:boatId}
    publish(this.messageContext,BOATMC,payload);

  }
  
  // The handleSave method must save the changes in the Boat Editor
  // passing the updated fields from draftValues to the 
  // Apex method updateBoatList(Object data).
  // Show a toast message with the title
  // clear lightning-datatable draft values
  handleSave(event) {
    // notify loading
    const updatedFields = event.detail.draftValues;
    // Update the records via Apex
    updateBoatList({data: updatedFields})
    .then((data) => {
      const saveEvent = new ShowToastEvent({
        title:SUCCESS_TITLE,
        variant:SUCCESS_VARIANT,
        message:MESSAGE_SHIP_IT
      });
      this.dispatchEvent(saveEvent);
      this.refresh();
    })
    .catch(error => {
      const errorEvent = new ShowToastEvent({
        title:ERROR_TITLE,
        variant:ERROR_VARIANT,
      });
      this.dispatchEvent(errorEvent);
    })
    .finally(() => {
      this.draftValues = [];
    });
  }
  // Check the current value of isLoading before dispatching the doneloading or loading custom event
  notifyLoading(isLoading) {
    if(this.isLoading) {
      this.dispatchEvent(new customEvent('loading'))
    }
    else {
      this.dispatchEvent(new customEvent('doneloading'))
    }
   }
}
