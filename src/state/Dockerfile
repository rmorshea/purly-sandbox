FROM python:3.6

RUN mkdir /sandbox
WORKDIR /sandbox

ADD requirements /sandbox

RUN pip install --upgrade pip
RUN pip install -r requirements

EXPOSE 8000

ADD run.py /sandbox
CMD ["python", "-u", "run.py"]
