import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/Tabs/HomeScreen";
import ChatScreen from "../screens/Tabs/ChatScreen";
import CallScreen from "../screens/Tabs/CallScreen";
import GalleryScreen from "../screens/Tabs/GalleryScreen";
import OthersScreen from "../screens/Tabs/OthersScreen";
import AccountScreen from "../screens/AccountScreen"
import Ionicons from "react-native-vector-icons/Ionicons";
import { TouchableOpacity } from "react-native";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route, navigation }) => ({
        tabBarStyle: {
        height: 80, //ncrease tab bar height
        paddingBottom: 15,
        paddingTop: 10,
        borderTopLeftRadius: 20,//rounded corners
        borderTopRightRadius: 20,
        backgroundColor: '#fff',//set background color
        },
         tabBarLabelStyle: {
        	fontSize: 15,
        	fontWeight: 'bold',
        	marginBottom: 5, //ajust vertical position
    	},
    	tabBarIconStyle: {
        	marginTop: 0,//icon adjsjt
    	},
    	tabBarStyle: {
        	height: 80,
        	paddingBottom: 10,
        	paddingTop: 5,
        },
      
        headerShown: true,
        headerTitle: route.name === "Home"
          ? "Home"
          : route.name === "Chat"
          ? "Chat"
          : route.name,
          headerTitleStyle: {
      	  	fontSize: 23,
      		fontWeight: "bold"
    	  },
          headerRight: () =>
  		route.name !== "Account" ? (
    		<TouchableOpacity onPress={() => navigation.navigate("Account")} style={{ marginRight: 16 }}>
      			<Ionicons name="person-circle-outline" size={35} color="#007AFF" />
   			 </TouchableOpacity>
  	  ) : null,

        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = "home-outline";
          else if (route.name === "Chat") iconName = "chatbubble-outline";
          else if (route.name === "Call") iconName = "call";
          else if (route.name === "Gallery") iconName = "images-outline";
	  else if (route.name === "Others") iconName = "grid-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Call" component={CallScreen} />
      <Tab.Screen name="Gallery" component={GalleryScreen} />
      <Tab.Screen name="Others" component={OthersScreen} />

    </Tab.Navigator>
  );
}
