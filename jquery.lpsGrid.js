(function( $ ) {

    $.fn.lpsGrid = function(options, methodOptions) {
        /*if(methodOptions) {
            this[options](methodOptions);
            return;
        }*/
        var _lpsGrid = this;
        var _$lpsElement;
        var setOutTimer;
        var settings = $.extend({
            url: null,
            dataType: "json",
            colNames: [],
            colModel: [],
            currentPage: 1,
            rowNum: 2,
            sortname: 'loginId',
            sortorder: "asc",
            altRows: false,
            loadComplete: null,
            deleteBtn: null,
            generateEditBar: [],
            noDataContent: '<div class="no-configuration">No Data Found</div>',
            totalPages: 1
        }, options );
        var __data = null;

        this.initiateGRID = function(that) {
            _$lpsElement = $(that);
            _lpsGrid.generateMarkup();
        }

        this.generateMarkup = function(data) {
            _$lpsElement.addClass('lpsGrid');
            var $head = $('<div class="lps-header"></div>');
            for(var i=0;i<settings.colModel.length;i++){
                var obj = settings.colModel[i];
                var $th = $('<div class="cell"><span>' + settings.colNames[i] + '</span></div>');
                if(obj.sortable != false){
                    (function(oname){
                        $th.addClass('sortable').click(function(){
                            var $this = $(this);
                            var order = 'desc';
                            if($this.hasClass('desc')){
                                order = 'asc';
                            }
                            else if($this.hasClass('asc')){
                                order = 'desc'
                            }
                            else {
                                order = 'asc';
                            }

                            $('.cell.sortable').removeClass('asc').removeClass('desc');
                            $(this).addClass(order);

                            settings.currentPage = 1;
                            settings.sortname = oname;
                            settings.sortorder = order;
                           _lpsGrid.fetchData({url: settings.cacheURL});
                        });
                    })(obj.index);
                }
                if(obj.width)
                    $th.css('width', obj.width);

                $head.append($th);
            }
            $head.append('<div class="clear"></div>');
            _$lpsElement.append($head);

            _$lpsElement.append('<div class="lps-content"></div>');

            //generate html code for pager
            //$('<div class="lps-pager"><span class="first-link first-dis"></span><span class="prev-link prev-dis"></span><span class="show">Page <input type="text" value="1" /> of 1</span><span class="next-link next-dis"></span><span class="last-link last-dis"></span><div class="clear"></div></div><div class="lpsGrid-msg"></div><div class="clear"></div>').insertBefore(_$lpsElement);

            //consider page code is already there.

            $('.lps-pager .prev-link, .lps-pager .next-link, .lps-pager .first-link, .lps-pager .last-link, .lps-pager .refresh-icon').click(function(){
               _lpsGrid.handlePager(this);
            });
            $('.lps-pager .view-sizer').change(function(){
                var v = $(this).val();
                $('.view-sizer').val(v);
                _lpsGrid.handlePager(this, v);
            });
            $('.lps-pager input.txt').keypress(function(e) {
                if(e.which == 13) {
                    _lpsGrid.handlePager(this, null, $(this).val());
                }
            });

            _lpsGrid.fetchData();
        }

        this.reloadGrid = function(ops, doNotResetCurrentPage) {
            if(!doNotResetCurrentPage)
                settings.currentPage = 1;   //reset page
            this.fetchData(ops, true);    //force to cancel current request and fetch new
        }
        this.getRowData = function() {
            return __data;
        }
        this.fetchData = function(ops, fetchNew){
            //if loader is already showing cancel new request
            if(_$lpsElement.find('.lps-loader').size() > 0 && !fetchNew) {
                return; // cancel the new operation to wait the already inprogress request to be finished
            }
            if(fetchNew) {
                settings.fetchedAjax.abort();   //kill the previous request
            }
            _lpsGrid.showLoader();
            var page = settings.currentPage;
            var id = settings.sortname;
            var order = settings.sortorder;
            var dataVal = "_search=false&rows=" + settings.rowNum + "&page=" + page + "&sidx=" + id + "&sord=" + order;
            settings.cacheURL = ops && ops.url ? ops.url : settings.url;
            settings.fetchedAjax = $.ajax({
                dataType: "json",
                data: dataVal,
                url: settings.cacheURL,
                success: function(data,status,obj){
                    _lpsGrid.hideLoader();
                    if(settings.beforeGeneratingContent) {
                        settings.beforeGeneratingContent(data, settings.colModel);
                    }
                    _lpsGrid.updateContent(data);
                    _lpsGrid.updatePager(data);
                    if(settings.onLoadComplete){
                        settings.onLoadComplete(data);
                    }
                    __data = data;
                    $('input.lpsCheck').prop('checked', false);
                }
             });
        }

        this.updateContent = function(data){
            var showCheckBox = false;
            if(data){
                if(settings.generateEditBar.length > 0)
                    showCheckBox = true;

                for(var i=0;i<data.rows.length;i++){
                    var row = data.rows[i];
                    var $row = $('<div class="lps-row"></div>');
                    if(row.disabled){
                        $row.addClass('disabled');
                    }

                    for(var j=0;j<settings.colModel.length;j++){
                        var obj = settings.colModel[j];
                        var $cell = $('<div data-bind="' + obj.name + '" class="cell"></div>');

                        //add checkbox to first column if edit/delete is enabled
                        if(showCheckBox && j==0){
                            var $chk = $('<input class="lpsCheck" name="lpsCheck" type="radio" />');
                            $cell.append($chk);
                        }

                        var cellValue = _lpsGrid.getProperty(row, obj.name);
                        if(obj.formatter){
                            $cell.html(obj.formatter(cellValue, obj.name, row));
                        }
                        else {
                            $cell.append('<span>' + cellValue + '</span>');
                        }

                        if(obj.width)
                            $cell.css('width', obj.width);

                        if(obj.hidden){
                            $cell.hide();
                        }

                        if(obj.addClass){
                            $cell.addClass(obj.addClass);
                        }

                        $row.append($cell);
                    }
                    $row.append('<div class="clear"></div>');
                    _$lpsElement.find('.lps-content').append($row);
                }
                settings.currentPage = parseInt(data.page, 10);

                if(data.rows.length < 1)
                    _lpsGrid.displayNoDataMessage();
            }
            else {
                _lpsGrid.displayNoDataMessage();
            }
        }

        this.getProperty = function(o, s) {
            if(s){
                s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
                s = s.replace(/^\./, '');           // strip a leading dot
                var a = s.split('.');
                while (a.length) {
                    var n = a.shift();
                    if (n in o) {
                        o = o[n];
                    } else {
                        return;
                    }
                }
                return o;
            }
            else {
                return '';
            }
        }

        this.showLoader = function(){
            _$lpsElement.find('.lps-content').html('<div class="lps-loader"></div>');
        }
        this.hideLoader = function(){
            _$lpsElement.find('.lps-loader').remove();
        }
        this.displayNoDataMessage = function() {
            _$lpsElement.find('.lps-content').html(settings.noDataContent);
        }
        this.showLoaderInFancy = function(loaded) {
            $.fancybox({
                'hideOnOverlayClick': false,
                'showCloseButton': false,
                'content': '<div class="popup-loader"></div>',
                'onComplete': loaded
            });
        }
        this.hiderLoaderInFancyAndShowError = function(msg) {
            $.fancybox({
                'hideOnOverlayClick': true,
                'showCloseButton': true,
                'content': msg
            });
        }

        this.showInlineSuccess = function(msg){
            clearTimeout(setOutTimer);
            $('.lpsGrid-msg').html('').show();
            $('.lpsGrid-msg').html('<div class="tick-icon green successMessage">' + msg + '</div>');//.hide(2000);
            setOutTimer = setTimeout(function(){
                $('.lpsGrid-msg .successMessage').fadeOut(600);
            },4000);
        }
        this.showInlineError = function(msg){
            clearTimeout(setOutTimer);
            $('.lpsGrid-msg').html('');
            $('.lpsGrid-msg').html('<div class="cross-icon red successMessage">' + msg + '</div>').show();//.hide(2000);
            setOutTimer = setTimeout(function(){
                $('.lpsGrid-msg .successMessage').fadeOut(600);
            },4000);
        }

        this.handlePager = function(that, v, toPage){
            var $this = $(that);
            if(toPage) {
                if(!isNaN(toPage) && toPage > 0 && toPage <= settings.totalPages){
                    settings.currentPage = toPage;
                }
                else {
                    settings.currentPage = 1;
                }
                _lpsGrid.fetchData({url: settings.cacheURL});
                return;
            }
            if(v) {
                //change the size of page
                settings.rowNum = v;
                _lpsGrid.fetchData({url: settings.cacheURL});
                return;
            }
            var hasAttrOpacity1 = $this.css('opacity') == '1';
            if($this.hasClass('next-link') && hasAttrOpacity1){
                settings.currentPage++;
                _lpsGrid.fetchData({url: settings.cacheURL});
            }
            else if($this.hasClass('prev-link') && hasAttrOpacity1){
                settings.currentPage--;
                _lpsGrid.fetchData({url: settings.cacheURL});
            }
            else if($this.hasClass('first-link') && hasAttrOpacity1){
                settings.currentPage = 1;
                _lpsGrid.fetchData({url: settings.cacheURL});
            }
            else if($this.hasClass('last-link') && hasAttrOpacity1){
                settings.currentPage = settings.totalPages;
                _lpsGrid.fetchData({url: settings.cacheURL});
            }
            else if($this.hasClass('refresh-icon')) {
                settings.currentPage = 1;
                _lpsGrid.fetchData({url: settings.cacheURL});
            }
        }

        this.updatePager = function(data) {
            var cPage = settings.currentPage;
            var tPages = 0;
            var records = 0;
            var start = 0;
            var end = 0;
            if(data){
                tPages = parseInt(data.total, 10);
                records = parseInt(data.records, 10);

                start = ((cPage-1) * settings.rowNum) + 1;
                end = ((start-1) + settings.rowNum) > records ? records : ((start-1) + settings.rowNum);
                start = end < start ? 0 : start;
                settings.totalPages = tPages;
            }

            //$('.lps-pager .show').html('Showing ' + start + '-' + end + ' of ' + records );
            $('.lps-pager input.txt').val(cPage);
            $('.lps-pager .ofPage').html('of ' + tPages);
            //enable/disable next/prev buttons
            if(cPage < tPages){
                $('.lps-pager .next-link').css('opacity', 1);//removeClass('next-dis').addClass('next');
                $('.lps-pager .last-link').css('opacity', 1);
            }
            else {
                $('.lps-pager .next-link').css('opacity', .35);//removeClass('next').addClass('next-dis');
                $('.lps-pager .last-link').css('opacity', .35);
            }

            if(cPage < 2){
                $('.lps-pager .prev-link').css('opacity',.35);//.removeClass('prev').addClass('prev-dis');
            }
            else {
                $('.lps-pager .prev-link').css('opacity', 1);//.removeClass('prev-dis').addClass('prev');
            }

            //enable/disable first/last buttons
            if(cPage > 1) {
                $('.lps-pager .first-link').css('opacity', 1);
            }
            else {
                $('.lps-pager .first-link').css('opacity',.35);
            }

            if(tPages == 1) {
                $('.lps-pager input.txt').attr('disabled', 'disabled');
            }
            else {
                $('.lps-pager input.txt').removeAttr('disabled');
            }
        }


        return this.each(function() {
            //this -- html object
            _lpsGrid.initiateGRID(this);
        });

    };

}( jQuery ));