from rest_framework import serializers
from .models import CallSession


class CallHistorySerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    direction = serializers.SerializerMethodField()
    caller_name = serializers.SerializerMethodField()

    class Meta:
        model = CallSession
        fields = ['id', 'call_type', 'started_at', 'ended_at', 'status', 'participants', 'direction', 'caller_name']

    def get_participants(self, obj):
        return [p.user.display_name or p.user.username for p in obj.participants.select_related('user').all()]

    def get_caller_name(self, obj):
        return obj.caller.display_name or obj.caller.username if obj.caller else 'Unknown'

    def get_direction(self, obj):
        request = self.context.get('request')
        if request and request.user:
            if obj.caller_id == request.user.id:
                return 'outgoing'
            if obj.status.lower() in ['rejected', 'missed', 'failed']:
                return 'missed'
            return 'incoming'
        return 'incoming'
