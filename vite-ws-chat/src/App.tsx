import React, { useState, useEffect } from "react";
// import SockJS from "sockjs-client";
import Stomp from "stompjs";
import SockJS from 'sockjs-client/dist/sockjs.js';
import userIcon from "./img/user_icon.png"

const App = () => {
  const [stompClient, setStompClient] = useState(null);
  const [nickname, setNickname] = useState("");
  const [fullname, setFullname] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    window.onbeforeunload = () => {
      if (stompClient) {
        stompClient.send(
          "/app/user.disconnectUser",
          {},
          JSON.stringify({
            nickName: nickname,
            fullName: fullname,
            status: "OFFLINE",
          })
        );
      }
    };
  }, [stompClient, nickname, fullname]);

  const connect = async (event) => {
    event.preventDefault();
    if (nickname && fullname) {
      const socket = new SockJS("/ws");
      // const socket = new SockJS("http://localhost:8088/ws");

      // const socket = new SockJS("http://localhost:8088/ws");

      const stomp = Stomp.over(socket);

      stomp.connect(
        {},
        () => {
          stomp.subscribe(`/user/${nickname}/queue/messages`,onMessageReceived);
          stomp.subscribe(`/user/public`, onUsersReceived);
          stomp.send("/app/user.addUser", {},JSON.stringify({
              nickName: nickname,
              fullName: fullname,
              status: "ONLINE",
            })
          );
          findAndDisplayConnectedUsers();
          setIsConnected(true);
          setStompClient(stomp);
        },
        onError
      );
    }
  };

  const findAndDisplayConnectedUsers = async () => {
    const connectedUsersResponse = await fetch("/users");
    let connectedUsers = await connectedUsersResponse.json();
    connectedUsers = connectedUsers
      .filter((user) => user.nickName !== nickname)
      .map((user) => ({ ...user, unreadMessages: 0 }));

    setConnectedUsers(connectedUsers);
  };

  const sendMessage = (event) => {
    event.preventDefault();
    if (messageContent && stompClient && selectedUserId) {
      const chatMessage = {
        senderId: nickname,
        recipientId: selectedUserId,
        content: messageContent,
        timestamp: new Date(),
      };
      stompClient.send("/app/chat", {}, JSON.stringify(chatMessage));
      setMessages([...messages, chatMessage]);
      setMessageContent("");
    }
  };

  const onUsersReceived = async () => {
    await findAndDisplayConnectedUsers(); 
  }

  const onMessageReceived = async (payload) => {
    const message = JSON.parse(payload.body);

    // Только добавляем сообщение в состояние, если оно относится к текущему выбранному пользователю
    if (
      !selectedUserId ||
      message.senderId === selectedUserId ||
      message.recipientId === selectedUserId
    ) {
      setMessages((prevMessages) => [...prevMessages, message]);
    }
    console.log({message})

    // Обновляем количество непрочитанных сообщений
    if (selectedUserId !== message.senderId) {
      setConnectedUsers((users) =>
        users.map((user) =>
          user.nickName === message.senderId
            ? { ...user, unreadMessages: user.unreadMessages + 1 }
            : user
        )
      );
    }
  };

  const onError = () => {
    console.log("Could not connect to WebSocket server.");
  };

  const userItemClick = (userId) => {
    setSelectedUserId(userId);
    setConnectedUsers((users) =>
      users.map((user) =>
        user.nickName === userId ? { ...user, unreadMessages: 0 } : user
      )
    );
  };

  const onLogout = () => {
    if (stompClient) {
      stompClient.send(
        "/app/user.disconnectUser",
        {},
        JSON.stringify({
          nickName: nickname,
          fullName: fullname,
          status: "OFFLINE",
        })
      );
      stompClient.disconnect();
    }
    window.location.reload();
  };

  return (
    <div>
      <h2>One to One Chat | Spring boot & Websocket | By Igor Klein</h2>
      {!isConnected ? (
        <div className="user-form" id="username-page">
          <h2>Enter Chatroom</h2>
          <form id="usernameForm" onSubmit={connect}>
            <label htmlFor="nickname">Nickname:</label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              required
              onChange={(e) => setNickname(e.target.value)}
            />
            <label htmlFor="fullname">Real Name:</label>
            <input
              type="text"
              id="fullname"
              name="realname"
              required
              onChange={(e) => setFullname(e.target.value)}
            />
            <button type="submit">Enter Chatroom</button>
          </form>
        </div>
      ) : (
        <div className="chat-container" id="chat-page">
          <div className="users-list">
            <div className="users-list-container">
              <h2>Online Users</h2>
              <h2>users : {connectedUsers.length}</h2>

              <ul id="connectedUsers">
                {connectedUsers.map((user) => (
                  <li
                    key={user.nickName}
                    className={`user-item ${
                      user.nickName === selectedUserId ? "active" : ""
                    }`}
                    
                    onClick={() => userItemClick(user.nickName)}
                  >
                    <img src={userIcon} alt={user.nickName} />
                    <span>{user.fullName}</span>
                    {user.unreadMessages > 0 && (
                      <span className="nbr-msg">{user.unreadMessages}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p id="connected-user-fullname">{fullname}</p>
              <a
                className="logout"
                href="javascript:void(0)"
                onClick={onLogout}
              >
                Logout
              </a>
            </div>
          </div>

          <div className="chat-area">
            <div className="chat-messages" id="chat-messages">
              {messages
                .filter(
                  (msg) =>
                    (msg.senderId === selectedUserId &&
                      msg.recipientId === nickname) ||
                    (msg.recipientId === selectedUserId &&
                      msg.senderId === nickname)
                )
                .map((msg, index) => (
                  <div
                    key={index}
                    className={`message ${
                      msg.senderId === nickname ? "sender" : "receiver"
                    }`}
                  >
                    <p>{msg.content}</p>
                  </div>
                ))}
            </div>
            <form
              id="messageForm"
              onSubmit={sendMessage}
              className="message-input"
            >
              <input
                autoComplete="off"
                type="text"
                id="message"
                placeholder="Type your message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
              <button>Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
