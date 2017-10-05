angular
    .module('angular-simple-chat.directives')
    .directive('messageComposer', messageComposer);

/* @ngInject */
function messageComposer() {
    var directive = {
        bindToController: true,
        controller: messageComposerController,
        controllerAs: 'mc',
        link: link,
        restrict: 'AE',
        require: ['^simpleChat', 'messageComposer'],
        templateUrl: 'directives/message-composer/message-composer.html'
    };
    return directive;

    function link(scope, element, attrs, controllers) {
        var simpleChatCtrl = controllers[0],
            messageComposerCtrl = controllers[1];
        messageComposerCtrl.foreignobjectid = simpleChatCtrl.foreignobjectid;
        messageComposerCtrl.localUser = simpleChatCtrl.localUser;
        messageComposerCtrl.sendFunction = simpleChatCtrl.sendFunction;
        messageComposerCtrl.sendButtonText = simpleChatCtrl.sendButtonText;
        messageComposerCtrl.composerPlaceholderText = simpleChatCtrl.composerPlaceholderText;
        messageComposerCtrl.options = simpleChatCtrl.options;
        messageComposerCtrl.messages = simpleChatCtrl.messages;
        messageComposerCtrl.liveFlagFunction = simpleChatCtrl.liveFlagFunction;
        messageComposerCtrl.mentions = simpleChatCtrl.mentions;
        messageComposerCtrl.element = element.find('textarea')[0];
    }
}
function getInputSelection(el) {
    var start = 0, end = 0, normalizedValue, range,
        textInputRange, len, endRange;

    if (typeof el.selectionStart == "number" && typeof el.selectionEnd == "number") {
        start = el.selectionStart;
        end = el.selectionEnd;
    } else {
        range = document.selection.createRange();

        if (range && range.parentElement() == el) {
            len = el.value.length;
            normalizedValue = el.value.replace(/\r\n/g, "\n");

            // Create a working TextRange that lives only in the input
            textInputRange = el.createTextRange();
            textInputRange.moveToBookmark(range.getBookmark());

            // Check if the start and end of the selection are at the very end
            // of the input, since moveStart/moveEnd doesn't return what we want
            // in those cases
            endRange = el.createTextRange();
            endRange.collapse(false);

            if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
                start = end = len;
            } else {
                start = -textInputRange.moveStart("character", -len);
                start += normalizedValue.slice(0, start).split("\n").length - 1;

                if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
                    end = len;
                } else {
                    end = -textInputRange.moveEnd("character", -len);
                    end += normalizedValue.slice(0, end).split("\n").length - 1;
                }
            }
        }
    }

    return {
        start: start,
        end: end
    };
}
/* @ngInject */
function messageComposerController($scope) {
    
    var that = this,
        resetLiveLastMessageReference = false,
        _sendFx = function () {
            if (!angular.isDefined(that.rawmessage)) {
                return;
            }
            var _message = {
                id: 'sc' + Date.now(),
                type: 'message',
                text: that.rawmessage,
                userId: that.localUser.userId,
                avatar: that.localUser.avatar,
                userName: that.localUser.userName,
                date: Date.now()
            };
            if (that.options.liveMode && angular.isDefined(that.liveFlagFunction) && that.rawmessage.length === 1) {
                that.liveFlagFunction({
                    id: 'sc' + Date.now(),
                    type: 'flag',
                    userId: that.localUser.userId,
                    label: 'startSentence'
                });
            }
            if (!resetLiveLastMessageReference) {
                that.sendFunction(_message);
            }
            if (that.options.liveMode && !resetLiveLastMessageReference) {
                if (that.messages.length === 0) {
                    that.messages.push(_message);
                } else {
                    if (that.rawmessage.length === 1) {
                        that.messages.push(_message);
                    } else {
                        that.messages[that.messages.length - 1] = _message;
                    }
                }
            } else if (that.options.liveMode && resetLiveLastMessageReference) {
                resetLiveLastMessageReference = false;
                that.rawmessage = '';
                that.liveFlagFunction({
                    id: 'sc' + Date.now(),
                    type: 'flag',
                    userId: that.localUser.userId,
                    label: 'endSentence'
                });
            } else {
                that.messages.push(_message);
            }
            $scope.$emit('simple-chat-message-posted');
            if (!that.options.liveMode) {
                that.rawmessage = '';
            }
        };
    $scope.$on('message-composer:appendText', function (event, obj) {
        if (obj && obj.uuid && obj.text) {
            if (that.foreignobjectid == obj.uuid)
                that.rawmessage += obj.text;
        }
    });
    this._send = function () {
        if (this.options.liveMode) {
            resetLiveLastMessageReference = true;
        }
        _sendFx();
    };
    this._onKeyDown = function (event) {
        if (event.keyCode === 38 || event.keyCode === 40) {
            event.preventDefault();
            return false;
        }
    }
    this._onKeyUp = function (event) {
        if (event.keyCode == 38) {
            $scope.$emit('mention-up', this.foreignobjectid);
        }
        var foo = getInputSelection(that.element);
        var charBeforeCursor;
        if (that.rawmessage && that.rawmessage.length > 0) 
            charBeforeCursor = that.rawmessage.substring(foo.start-1, foo.start);
        else 
            charBeforeCursor = '';
        
        if (event.key == '@' || charBeforeCursor == '@') {
            $scope.$emit('mention', this.foreignobjectid);
            this.inMention = true;
        } else {
            if (!charBeforeCursor.match(/\w/) || this.inMention && (event.keyCode == 32 || event.keyCode == 8 || event.keyCode == 46 )) {
                $scope.$emit('mention-stop', this.foreignobjectid);
                this.inMention = false;
            } else if (this.inMention && event.keyCode == 38) {
                console.log('arrow up!');
            }
        }
        if (this.inMention && foo.start == foo.end) {
            // $scope.$emit('mention-query-input', charBeforeCursor);
        }
        if (this.options.liveMode) {
            _sendFx();
        }
    };
}
