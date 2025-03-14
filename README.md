# 这是Bruce的Agent Demo 
> ## 库中有两个文件夹，一个前端一个后端，主要的实现代码
  - backend/main.py
  - frontend/app.js
> ## 现在存在的主要问题
  - ### 在上传文件时，总是出错，报错信息如下
        <br>响应状态：500
        <br>响应数据：响应数据:	▶{status: 'error', detail: '[SSL: WRONG_VERSION_NUMBER] wrong version number (_sst.c:1020)'}	App.js:124
  - ### 我猜测是main.py文件中，与ragflow相关的那部分代码有点问题，因为我不太了解到底怎么写段代码才能使前端上传文件后，后端正确调用ragflow的各种功能
> ## 启动方法
  - 启动Docker Desktop
  - 启动后端：<br> cd backend
             <br> uvicorn main:app --reload --port 8000
  - 启动前端：<br>cd frontend
             <br> npm start
  - 然后浏览器就自动打开localhost:3000了

