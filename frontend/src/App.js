
// // frontend/src/App.js
// import React, { useState } from 'react';
// import { Upload, Button, Modal, message } from 'antd';
// import { InboxOutlined } from '@ant-design/icons';

// const { Dragger } = Upload;

// function App() {
//   const [visible, setVisible] = useState(false);
//   const [documentId, setDocumentId] = useState(null);

//   // 文件上传处理逻辑
//   const handleUpload = async (file) => {
//     try {
//       const formData = new FormData();
//       formData.append('file', file);
      
//       const res = await fetch('/api/upload', {
//         method: 'POST',
//         body: formData
//       });
      
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.detail || '上传失败');
      
//       setDocumentId(data.document_id);
//       message.success('文件上传成功！');
//     } catch (err) {
//       message.error(`上传失败: ${err.message}`);
//     }
//     return false;
//   };

//   return (
//     <div className="App">
//       <Button type="primary" onClick={() => setVisible(true)}>
//         打开合同审核助手
//       </Button>

//       <Modal
//         title="合同审核助手"
//         visible={visible}
//         width={1200}
//         onCancel={() => setVisible(false)}
//         footer={null}
//         bodyStyle={{ height: '70vh' }}
//       >
//         {/* 文件上传区域 */}
//         <Dragger
//           accept=".pdf,.docx"
//           beforeUpload={handleUpload}
//           showUploadList={false}
//           style={{ marginBottom: 24 }}
//         >
//           <p className="ant-upload-drag-icon">
//             <InboxOutlined />
//           </p>
//           <p>点击或拖拽合同文件到此区域上传</p>
//         </Dragger>

//         {/* 嵌入式聊天窗口 */}
//         {documentId && (
//           <iframe
//             src={`http://localhost/chat/share?shared_id=a4f0a9cafafa11efbff00242ac120005&from=chat&auth=U3NjQyN2U2ZmE4NzExZWY4ZTczMDI0Mm&document_id=${documentId}`}
//             style={{
//               width: '100%',
//               height: '600px',
//               border: '1px solid #e8e8e8',
//               borderRadius: '8px'
//             }}
//             frameBorder="0"
//             sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
//             title="合同审核对话窗口"
//           />
//         )}
//       </Modal>
//     </div>
//   );
// }

// export default App;










// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { Upload, Button, Modal, Input, List, Spin, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import './App.css';

const { Dragger } = Upload;

function App() {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [documentId, setDocumentId] = useState(null);
  const [ws, setWs] = useState(null);
  const [loading, setLoading] = useState(false);

  // 处理文件上传
  const handleUpload = async (file) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      console.log("开始上传文件...");
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
        mode: "cors",
        credentials: "include"
      });
      console.log("响应状态:", res.status);
      const data = await res.json();
      console.log("响应数据:", data);


      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || '上传失败');
      }

      const { document_id } = await res.json();
      setDocumentId(document_id);
      console.log("document_id:", document_id);
      message.success('文件上传成功！');
      

      
      // 建立WebSocket连接
      const socket = new WebSocket(`ws://${window.location.hostname}:8000/ws/${document_id}`);
      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.choices?.[0]?.delta?.content) {
            setMessages(prev => updateMessages(prev, data, 'answer'));
          }
        } catch(err) {
          console.error('解析错误:', err);
        }
      };
      setWs(socket);
      
    } catch (err) {
      message.error(`上传失败: ${err.message}`);
    } finally {
      setLoading(false);
    }

    return false;
  };

  // 更新消息列表
  const updateMessages = (prev, data, type) => {
    const content = data.choices[0].delta.content;
    const lastMsg = prev[prev.length - 1];
    
    if (lastMsg?.type === type) {
      return [
        ...prev.slice(0, -1),
        { ...lastMsg, content: lastMsg.content + content }
      ];
    }
    return [...prev, { content, isBot: true, type }];
  };

  // 发送问题
  const handleSend = () => {
    if (!inputMsg.trim() || !ws) return;
    
    setMessages(prev => [...prev, {
      content: inputMsg,
      isBot: false,
      type: 'question'
    }]);
    
    ws.send(inputMsg);
    setInputMsg('');
  };

  return (
    <div className="App">
      <Button type="primary" onClick={() => setVisible(true)}>
        打开合同审核助手
      </Button>

      <Modal
        title="合同审核助手"
        open={visible}
        width={800}
        onCancel={() => {
          setVisible(false);
          ws?.close();
        }}
        footer={null}
      >
        <Dragger
          accept=".pdf,.docx"
          beforeUpload={handleUpload}
          showUploadList={false}
          disabled={loading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p>点击或拖拽合同文件到此区域上传</p>
          {loading && <Spin tip="文件解析中..." />}
        </Dragger>

        <List
          className="chat-list"
          dataSource={messages}
          renderItem={(item, index) => (
            <List.Item key={index}>
              <div className={`chat-bubble ${item.isBot ? 'bot' : 'user'}`}>
                {item.type === 'answer' && <span className="tag">[审核结果]</span>}
                {item.content}
              </div>
            </List.Item>
          )}
        />

        <Input.Search
          placeholder="输入关于合同的问题..."
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onSearch={handleSend}
          enterButton={<Button type="primary" disabled={!documentId}>提问</Button>}
          style={{ marginTop: 20 }}
        />
      </Modal>
    </div>
  );
}

export default App;