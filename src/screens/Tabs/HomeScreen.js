import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

function getCountdown(targetDate) {
  const now = new Date();
  const diff = Math.max(0, targetDate - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const mins = Math.floor(diff / (1000 * 60)) % 60;
  const secs = Math.floor(diff / 1000) % 60;
  return { days, hours, mins, secs, expired: diff === 0 };
}

export default function HomeScreen() {
  const [events, setEvents] = useState([
    { id: '1', title: 'Anniversary', date: new Date(Date.now() + 1000*60*60*24*30) }, // 30 days from now
    { id: '2', title: 'First Date', date: new Date('2023-01-01T00:00:00') },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // For live countdowns
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t+1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAddPress = () => {
    setNewEventTitle('');
    setNewEventDate(new Date());
    setShowModal(true);
  };

  const handleSave = () => {
    if (!newEventTitle.trim()) return;
    setEvents([
      { id: Date.now().toString(), title: newEventTitle, date: newEventDate },
      ...events,
    ]);
    setShowModal(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFD' }}>
      <View style={styles.floatingBox}>
        <Text style={styles.heading}>Your Events</Text>
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={({item}) => {
            const d = new Date(item.date);
            const eventInFuture = d > new Date();
            let countdown = eventInFuture ? getCountdown(d) : null;
            return (
              <View style={styles.eventBox}>
                <Text style={styles.eventText}>{item.title}</Text>
                <Text style={styles.dateText}>
                  {d.toLocaleDateString()} {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
                {eventInFuture ?
                  <Text style={styles.countdownText}>
                    Countdown: {countdown.days}d {countdown.hours}h {countdown.mins}m {countdown.secs}s
                  </Text> :
                  <Text style={styles.pastText}>Already happened</Text>
                }
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{textAlign: 'center', color:'#aaa'}}>No events yet</Text>}
        />

        <TouchableOpacity style={styles.button} onPress={handleAddPress}>
          <Text style={styles.buttonText}>Add Event</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for add event */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={()=>setShowModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={{fontWeight:'bold', fontSize:20, marginBottom:16}}>Add New Event</Text>
            <TextInput
              style={styles.input}
              placeholder="Event Name"
              value={newEventTitle}
              onChangeText={setNewEventTitle}
            />
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{fontSize:16}}>
                {newEventDate
                  ? `Pick Date: ${newEventDate.toLocaleDateString()} ${newEventDate.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`
                  : 'Choose Date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker &&
              <DateTimePicker
                value={newEventDate}
                mode="datetime"
                display={Platform.OS==='ios'?'inline':'default'}
                onChange={(_,date)=>{
                  if(date) setNewEventDate(date);
                  setShowDatePicker(false);
                }}
                minimumDate={new Date(2000,0,1)}
              />
            }
            <View style={{flexDirection:'row',justifyContent:'flex-end',marginTop:24}}>
              <TouchableOpacity onPress={()=>setShowModal(false)} style={styles.modalCancelBtn}>
                <Text style={{color:'#888',fontSize:16}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.modalSaveBtn}>
                <Text style={{color:'white',fontWeight:'bold',fontSize:16}}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 16,
    alignSelf:'center',
    // To help float lower than center
    marginTop: '25%',
    // Shadow for iOS
    shadowColor: '#5891FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    // Shadow for Android
    elevation: 10,
    minWidth: '84%',
  },
  heading: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign:'center', color:'#5891FF' },
  eventBox: {
    backgroundColor: '#EFEFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#5891FF',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  eventText: { fontSize: 19, fontWeight: '600', color: '#223' },
  dateText: { fontSize: 15, color: '#666', marginTop: 1 },
  countdownText: { color:'#5891FF', marginTop:4, fontWeight:'bold' },
  pastText:     { color:'#B55C69', marginTop:4, fontWeight:'bold' },

  button: {
    backgroundColor: '#5891FF',
    padding: 16,
    borderRadius: 100, // pill
    alignItems: 'center',
    marginTop: 12,
    alignSelf:'center',
    minWidth: 140,
    elevation: 2,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight:'bold' },

  // Add/Edit Modal styles
  modalBackground: {
    flex:1,
    backgroundColor: 'rgba(20,30,40,0.22)',
    justifyContent:'center',
    alignItems:'center'
  },
  modalBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 370,
  },
  input: {
    borderWidth: 1, borderColor: '#c5dafe', borderRadius: 8,
    padding: 12, marginBottom: 16, fontSize:17,
    backgroundColor:'#f0f6ff'
  },
  dateButton:{
    backgroundColor:'#e4eefe',
    borderRadius:7,
    padding:14,
    alignItems:'center',
    marginBottom:8
  },
  modalSaveBtn: {
    marginLeft: 10, backgroundColor:'#5891FF', paddingHorizontal:18, paddingVertical:8, borderRadius:7
  },
  modalCancelBtn: {
    paddingHorizontal:10, paddingVertical:8
  },
});


