# Gustos – add-on Home Assistant. Imagine Debian cu Python (pachete precompilate pentru Pillow, lxml, HEIC).
ARG BUILD_FROM=python:3.12-slim-bookworm
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    GUSTOS_DATA_DIR=/data

WORKDIR /app

# Dependențele întâi: se reinstalează doar când se schimbă requirements.txt
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install -r /app/backend/requirements.txt

# config.yaml = sursa unică a versiunii; interfața este deja compilată în backend/app/static
COPY config.yaml /app/config.yaml
COPY backend/app /app/backend/app
COPY run.sh /run.sh
RUN chmod a+x /run.sh

LABEL io.hass.type="addon" io.hass.name="Gustos"

EXPOSE 8099
CMD ["/run.sh"]
