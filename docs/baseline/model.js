const ParkingModel = (() => {
 const FRESH=5*60e3, UNKNOWN=15*60e3;
 function status(record, now) { if(!record) return 'unknown'; const age=now-record.end; return age>=UNKNOWN?'unknown':age>=FRESH?'stale':'recent'; }
 function complete(records, survey, count, now) {
  if(!Number.isInteger(count)||count<0||count>999) throw Error('Enter a whole number from 0 to 999.');
  if(!survey||now<survey.start) throw Error('Start a survey first.');
  if((records[survey.floor]?.version||0)!==survey.version) throw Error('A newer survey exists. Start a fresh survey rather than overwrite it.');
  return {...records,[survey.floor]:{count,start:survey.start,end:now,version:survey.version+1,coverage:'Entire illustrative level',observer:'Demo observer'}};
 }
 return {status,complete};
})();
if(typeof module!=='undefined')module.exports=ParkingModel;
