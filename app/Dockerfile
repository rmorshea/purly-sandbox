FROM python:3.6

RUN mkdir /sandbox
RUN mkdir /sandbox/py
RUN mkdir /sandbox/py/static
RUN mkdir /sandbox/js
WORKDIR /sandbox

# add sanic app files
ADD py/requirements /sandbox/py
ADD py/run.py /sandbox/py

# add react app files
ADD js/ /sandbox/js

# install python dependancies
RUN cd py && pip install -r requirements

# install npm
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get -y install npm

# install javascript dependancies
RUN cd js && npm install

# build react app for production
RUN cd js && npm run build

EXPOSE 8000
EXPOSE 8001

# start the sanic app
CMD ["python", "py/run.py"]
