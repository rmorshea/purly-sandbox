FROM python:3.6

RUN mkdir /sandbox
RUN mkdir /sandbox/py
RUN mkdir /sandbox/py/static
RUN mkdir /sandbox/js
WORKDIR /sandbox

# install npm
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get -y install npm

# add sanic app files
ADD py/requirements /sandbox/py
# install python dependancies
RUN pip install --upgrade pip
RUN cd py && pip install -r requirements

# add react app files
ADD js/ /sandbox/js
# install javascript dependancies
RUN cd js && npm install
# build react app for production
RUN cd js && npm run build

# to delete
ADD py/purly /sandbox/py/purly
RUN cd /sandbox/py/purly && pip install .

# start the sanic app
ADD py/run.py /sandbox/py
CMD ["python", "-u", "py/run.py"]
