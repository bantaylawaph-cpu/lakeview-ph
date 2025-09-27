# Project Structure

```
app/
  Http/
    Controllers/
      Api/
        LayerController.php
        OptionsController.php
        TenantController.php
      AuthController.php
      Controller.php
      EmailOtpController.php
      LakeController.php
      WatershedController.php
    Middleware/
      Authenticate.php
      EnforceTokenTTL.php
      EnsureRole.php
    Requests/
      StoreLayerRequest.php
      StoreTenantRequest.php
      UpdateLayerRequest.php
      UpdateTenantRequest.php
  Mail/
    OtpMail.php
  Models/
    Lake.php
    Layer.php
    Role.php
    Tenant.php
    User.php
    Watershed.php
  Providers/
    AppServiceProvider.php
bootstrap/
  cache/
    .gitignore
    packages.php
    services.php
  app.php
  app.php.bak
  providers.php
config/
  app.php
  auth.php
  cache.php
  database.php
  filesystems.php
  logging.php
  mail.php
  queue.php
  sanctum.php
  services.php
  session.php
database/
  factories/
    UserFactory.php
  migrations/
    0001_01_01_000000_create_users_table.php
    0001_01_01_000001_create_cache_table.php
    0001_01_01_000002_create_jobs_table.php
    2025_09_10_030010_create_personal_access_tokens_table.php
    2025_09_10_034243_create_roles_table.php
    2025_09_10_034403_create_tenants_table.php
    2025_09_10_034404_create_user_tenants_table.php
    2025_09_15_000001_update_layers_on_activate_stop_mirroring.php
    2025_09_15_000002_backfill_active_layers_from_lakes_geom.php
    2025_09_15_000003_drop_legacy_columns.php
    2025_09_16_125041_create_email_otps_table.php
    2025_09_17_202004_add_role_to_users_table.php
    2025_09_20_000001_align_tenants_table.php
  seeders/
    DatabaseSeeder.php
  .gitignore
frontend/
public/
  .htaccess
  favicon.ico
  hot
  index.php
  lakeview-logo-alt.png
  lakeview-logo.png
  nyehe.jpg
  robots.txt
  test1.png
resources/
  css/
    base/
      globals.css
      themes.css
    components/
      context-menu.css
      coordinates-scale.css
      form.css
      lake-info-panel.css
      layer-control.css
      map-controls.css
      modal.css
      screenshot-button.css
      search-bar.css
      sidebar.css
      table.css
      wizard.css
    layouts/
      dashboard/
        _variables.css
        card.css
        dashboard-sidebar.css
        forms.css
        header.css
        index.css
        kpi.css
        layout.css
        map.css
        responsive.css
        tables-helpers.css
      auth.css
    app.css
  js/
    components/
      layers/
        LayerList.jsx
        LayerWizard.jsx
      table/
        ColumnPicker.jsx
        FilterPanel.jsx
        TableToolbar.jsx
      AppMap.jsx
      AuthModal.jsx
      ConfirmDialog.jsx
      ContextMenu.jsx
      CoordinatesScale.jsx
      LakeForm.jsx
      LakeInfoPanel.jsx
      LayerControl.jsx
      MapControls.jsx
      MeasureTool.jsx
      Modal.jsx
      OrganizationForm.jsx
      RequireRole.jsx
      Screenshotbutton.jsx
      SearchBar.jsx
      Sidebar.jsx
      Wizard.jsx
    layouts/
      DashboardLayout.jsx
      TableLayout.jsx
    lib/
      api.js
      layers.js
    pages/
      AdminInterface/
        AdminDashboard.jsx
        adminLayers.jsx
        adminLogs.jsx
        adminOrganizations.jsx
        adminOverview.jsx
        adminParams.jsx
        adminSettings.jsx
        adminUsers.jsx
        adminWaterCat.jsx
      ContributorInterface/
        ContributorDashboard.jsx
      OrgInterface/
        OrgDashboard.jsx
        orgLayers.jsx
        orgLogTest.jsx
        orgMembers.jsx
        orgOverview.jsx
      PublicInterface/
        AboutData.jsx
        AboutPage.jsx
        LoginPage.jsx
        MapPage.jsx
        RegistrationPage.jsx
        Settings.jsx
        SubmitFeedback.jsx
        UserManual.jsx
    utils/
      alerts.js
      auth.js
      geo.js
    app.jsx
  views/
    mail/
      plain.blade.php
    app.blade.php
routes/
  api.php
  console.php
  web.php
storage/
  app/
    private/
      .gitignore
    public/
      .gitignore
    .gitignore
  framework/
    cache/
      data/
        .gitignore
      .gitignore
    sessions/
      .gitignore
      ognYo1oHgRXWuizwG8DSbiePshzqbyiSUkRsELMw
    testing/
      .gitignore
    views/
      .gitignore
      2faefa617993320919801b51a3fa73fa.php
      4e647341fc1bfdf8ee01988a1d80e673.php
      7b99c76489b9c8989f9e836382e34ae6.php
      08cc1485df208fa86c28bedd514951e1.php
      9fe38efdadd9183a5e37e797169f5f38.php
      17e82a6ef73313f1c173520e5a05bc05.php
      22c1997881e9cee13a0e76ac150d7c6b.php
      2916db224a0aae69c4c3ac8a019b2278.php
      378268abb80db39baee7a5ffc657bc94.php
      733195d6e3ec8edfcfb6bb4cb3bc5a21.php
      324783740f54f07a53c1a486d5799d7a.php
      b9b9e0340ef2ac170b27cccd75ce758a.php
      bddbe4bc29f702302e9cd2e1e77b67a0.php
      cc00a6290dbddc2216d77695c2d2e362.php
      ccc3b2570f163a7eaa3e7caf1954fefb.php
      d0569b5396cac6b33526e2c19dc67503.php
      e03943306be6248ef55102f9b48f46b4.php
      fc2704edfa87e8b925e75054e9c38e91.php
      ff099658ab088fe1f4a48e6d50234cac.php
    .gitignore
  logs/
    .gitignore
    laravel.log
tests/
  Feature/
    ExampleTest.php
  Unit/
    ExampleTest.php
  TestCase.php
vendor/
  bin/
    carbon
    carbon.bat
    patch-type-declarations
    patch-type-declarations.bat
    php-parse
    php-parse.bat
    phpunit
    phpunit.bat
    pint
    pint.bat
    psysh
    psysh.bat
    sail
    sail.bat
    var-dump-server
    var-dump-server.bat
    yaml-lint
    yaml-lint.bat
  brick/
    math/
      src/
        Exception/
          DivisionByZeroException.php
          IntegerOverflowException.php
          MathException.php
          NegativeNumberException.php
          NumberFormatException.php
          RoundingNecessaryException.php
        Internal/
          Calculator/
            BcMathCalculator.php
            GmpCalculator.php
            NativeCalculator.php
          Calculator.php
        BigDecimal.php
        BigInteger.php
        BigNumber.php
        BigRational.php
        RoundingMode.php
      CHANGELOG.md
      composer.json
      LICENSE
      psalm-baseline.xml
  carbonphp/
    carbon-doctrine-types/
      src/
        Carbon/
          Doctrine/
            CarbonDoctrineType.php
            CarbonImmutableType.php
            CarbonType.php
            CarbonTypeConverter.php
            DateTimeDefaultPrecision.php
            DateTimeImmutableType.php
            DateTimeType.php
      composer.json
      LICENSE
      README.md
  composer/
    autoload_classmap.php
    autoload_files.php
    autoload_namespaces.php
    autoload_psr4.php
    autoload_real.php
    autoload_static.php
    ClassLoader.php
    installed.json
    installed.php
    InstalledVersions.php
    LICENSE
    platform_check.php
  dflydev/
    dot-access-data/
      src/
        Exception/
          DataException.php
          InvalidPathException.php
          MissingPathException.php
        Data.php
        DataInterface.php
        Util.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
  doctrine/
    inflector/
      docs/
        en/
          index.rst
      src/
        Rules/
          English/
            Inflectible.php
            InflectorFactory.php
            Rules.php
            Uninflected.php
          Esperanto/
            Inflectible.php
            InflectorFactory.php
            Rules.php
            Uninflected.php
          French/
            Inflectible.php
            InflectorFactory.php
            Rules.php
            Uninflected.php
          Italian/
            Inflectible.php
            InflectorFactory.php
            Rules.php
            Uninflected.php
          NorwegianBokmal/
            Inflectible.php
            InflectorFactory.php
            Rules.php
            Uninflected.php
          Portuguese/
            Inflectible.php
            InflectorFactory.php
            Rules.php
            Uninflected.php
          Spanish/
            Inflectible.php
            InflectorFactory.php
            Rules.php
            Uninflected.php
          Turkish/
            Inflectible.php
            InflectorFactory.php
            Rules.php
            Uninflected.php
          Pattern.php
          Patterns.php
          Ruleset.php
          Substitution.php
          Substitutions.php
          Transformation.php
          Transformations.php
          Word.php
        CachedWordInflector.php
        GenericLanguageInflectorFactory.php
        Inflector.php
        InflectorFactory.php
        Language.php
        LanguageInflectorFactory.php
        NoopWordInflector.php
        RulesetInflector.php
        WordInflector.php
      composer.json
      LICENSE
      README.md
    lexer/
      src/
        AbstractLexer.php
        Token.php
      composer.json
      LICENSE
      README.md
      UPGRADE.md
  dragonmantank/
    cron-expression/
      src/
        Cron/
          AbstractField.php
          CronExpression.php
          DayOfMonthField.php
          DayOfWeekField.php
          FieldFactory.php
          FieldFactoryInterface.php
          FieldInterface.php
          HoursField.php
          MinutesField.php
          MonthField.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
  egulias/
    email-validator/
      src/
        Parser/
          CommentStrategy/
            CommentStrategy.php
            DomainComment.php
            LocalComment.php
          Comment.php
          DomainLiteral.php
          DomainPart.php
          DoubleQuote.php
          FoldingWhiteSpace.php
          IDLeftPart.php
          IDRightPart.php
          LocalPart.php
          PartParser.php
        Result/
          Reason/
            AtextAfterCFWS.php
            CharNotAllowed.php
            CommaInDomain.php
            CommentsInIDRight.php
            ConsecutiveAt.php
            ConsecutiveDot.php
            CRLFAtTheEnd.php
            CRLFX2.php
            CRNoLF.php
            DetailedReason.php
            DomainAcceptsNoMail.php
            DomainHyphened.php
            DomainTooLong.php
            DotAtEnd.php
            DotAtStart.php
            EmptyReason.php
            ExceptionFound.php
            ExpectingATEXT.php
            ExpectingCTEXT.php
            ExpectingDomainLiteralClose.php
            ExpectingDTEXT.php
            LabelTooLong.php
            LocalOrReservedDomain.php
            NoDNSRecord.php
            NoDomainPart.php
            NoLocalPart.php
            Reason.php
            RFCWarnings.php
            SpoofEmail.php
            UnableToGetDNSRecord.php
            UnclosedComment.php
            UnclosedQuotedString.php
            UnOpenedComment.php
            UnusualElements.php
          InvalidEmail.php
          MultipleErrors.php
          Result.php
          SpoofEmail.php
          ValidEmail.php
        Validation/
          Exception/
            EmptyValidationList.php
          Extra/
            SpoofCheckValidation.php
          DNSCheckValidation.php
          DNSGetRecordWrapper.php
          DNSRecords.php
          EmailValidation.php
          MessageIDValidation.php
          MultipleValidationWithAnd.php
          NoRFCWarningsValidation.php
          RFCValidation.php
        Warning/
          AddressLiteral.php
          CFWSNearAt.php
          CFWSWithFWS.php
          Comment.php
          DeprecatedComment.php
          DomainLiteral.php
          EmailTooLong.php
          IPV6BadChar.php
          IPV6ColonEnd.php
          IPV6ColonStart.php
          IPV6Deprecated.php
          IPV6DoubleColon.php
          IPV6GroupCount.php
          IPV6MaxGroups.php
          LocalTooLong.php
          NoDNSMXRecord.php
          ObsoleteDTEXT.php
          QuotedPart.php
          QuotedString.php
          TLD.php
          Warning.php
        EmailLexer.php
        EmailParser.php
        EmailValidator.php
        MessageIDParser.php
        Parser.php
      composer.json
      CONTRIBUTING.md
      LICENSE
  fakerphp/
    faker/
      src/
        Faker/
          Calculator/
            Ean.php
            Iban.php
            Inn.php
            Isbn.php
            Luhn.php
            TCNo.php
          Container/
            Container.php
            ContainerBuilder.php
            ContainerException.php
            ContainerInterface.php
            NotInContainerException.php
          Core/
            Barcode.php
            Blood.php
            Color.php
            Coordinates.php
            DateTime.php
            File.php
            Number.php
            Uuid.php
            Version.php
          Extension/
            AddressExtension.php
            BarcodeExtension.php
            BloodExtension.php
            ColorExtension.php
            CompanyExtension.php
            CountryExtension.php
            DateTimeExtension.php
            Extension.php
            ExtensionNotFound.php
            FileExtension.php
            GeneratorAwareExtension.php
            GeneratorAwareExtensionTrait.php
            Helper.php
            NumberExtension.php
            PersonExtension.php
            PhoneNumberExtension.php
            UuidExtension.php
            VersionExtension.php
          Guesser/
            Name.php
          ORM/
            CakePHP/
              ColumnTypeGuesser.php
              EntityPopulator.php
              Populator.php
            Doctrine/
              backward-compatibility.php
              ColumnTypeGuesser.php
              EntityPopulator.php
              Populator.php
            Mandango/
              ColumnTypeGuesser.php
              EntityPopulator.php
              Populator.php
            Propel/
              ColumnTypeGuesser.php
              EntityPopulator.php
              Populator.php
            Propel2/
              ColumnTypeGuesser.php
              EntityPopulator.php
              Populator.php
            Spot/
              ColumnTypeGuesser.php
              EntityPopulator.php
              Populator.php
          Provider/
            ar_EG/
              Address.php
              Color.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              Text.php
            ar_JO/
              Address.php
              Company.php
              Internet.php
              Person.php
              Text.php
            ar_SA/
              Address.php
              Color.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              Text.php
            at_AT/
              Payment.php
            bg_BG/
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            bn_BD/
              Address.php
              Company.php
              Person.php
              PhoneNumber.php
              Utils.php
            cs_CZ/
              Address.php
              Company.php
              DateTime.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            da_DK/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            de_AT/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            de_CH/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            de_DE/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            el_CY/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            el_GR/
              Address.php
              Company.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            en_AU/
              Address.php
              Internet.php
              PhoneNumber.php
            en_CA/
              Address.php
              PhoneNumber.php
            en_GB/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            en_HK/
              Address.php
              Internet.php
              PhoneNumber.php
            en_IN/
              Address.php
              Internet.php
              Person.php
              PhoneNumber.php
            en_NG/
              Address.php
              Internet.php
              Person.php
              PhoneNumber.php
            en_NZ/
              Address.php
              Internet.php
              PhoneNumber.php
            en_PH/
              Address.php
              PhoneNumber.php
            en_SG/
              Address.php
              Person.php
              PhoneNumber.php
            en_UG/
              Address.php
              Internet.php
              Person.php
              PhoneNumber.php
            en_US/
              Address.php
              Company.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            en_ZA/
              Address.php
              Company.php
              Internet.php
              Person.php
              PhoneNumber.php
            es_AR/
              Address.php
              Company.php
              Person.php
              PhoneNumber.php
            es_ES/
              Address.php
              Color.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            es_PE/
              Address.php
              Company.php
              Person.php
              PhoneNumber.php
            es_VE/
              Address.php
              Company.php
              Internet.php
              Person.php
              PhoneNumber.php
            et_EE/
              Person.php
            fa_IR/
              Address.php
              Company.php
              Internet.php
              Person.php
              PhoneNumber.php
              Text.php
            fi_FI/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            fr_BE/
              Address.php
              Color.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            fr_CA/
              Address.php
              Color.php
              Company.php
              Person.php
              Text.php
            fr_CH/
              Address.php
              Color.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            fr_FR/
              Address.php
              Color.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            he_IL/
              Address.php
              Company.php
              Payment.php
              Person.php
              PhoneNumber.php
            hr_HR/
              Address.php
              Company.php
              Payment.php
              Person.php
              PhoneNumber.php
            hu_HU/
              Address.php
              Company.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            hy_AM/
              Address.php
              Color.php
              Company.php
              Internet.php
              Person.php
              PhoneNumber.php
            id_ID/
              Address.php
              Color.php
              Company.php
              Internet.php
              Person.php
              PhoneNumber.php
            is_IS/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            it_CH/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            it_IT/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            ja_JP/
              Address.php
              Company.php
              Internet.php
              Person.php
              PhoneNumber.php
              Text.php
            ka_GE/
              Address.php
              Color.php
              Company.php
              DateTime.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            kk_KZ/
              Address.php
              Color.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            ko_KR/
              Address.php
              Company.php
              Internet.php
              Person.php
              PhoneNumber.php
              Text.php
            lt_LT/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            lv_LV/
              Address.php
              Color.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            me_ME/
              Address.php
              Company.php
              Payment.php
              Person.php
              PhoneNumber.php
            mn_MN/
              Person.php
              PhoneNumber.php
            ms_MY/
              Address.php
              Company.php
              Miscellaneous.php
              Payment.php
              Person.php
              PhoneNumber.php
            nb_NO/
              Address.php
              Company.php
              Payment.php
              Person.php
              PhoneNumber.php
            ne_NP/
              Address.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            nl_BE/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            nl_NL/
              Address.php
              Color.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            pl_PL/
              Address.php
              Color.php
              Company.php
              Internet.php
              LicensePlate.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            pt_BR/
              Address.php
              check_digit.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            pt_PT/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            ro_MD/
              Address.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            ro_RO/
              Address.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            ru_RU/
              Address.php
              Color.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            sk_SK/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            sl_SI/
              Address.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            sr_Cyrl_RS/
              Address.php
              Payment.php
              Person.php
            sr_Latn_RS/
              Address.php
              Payment.php
              Person.php
            sr_RS/
              Address.php
              Payment.php
              Person.php
            sv_SE/
              Address.php
              Company.php
              Municipality.php
              Payment.php
              Person.php
              PhoneNumber.php
            th_TH/
              Address.php
              Color.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            tr_TR/
              Address.php
              Color.php
              Company.php
              DateTime.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            uk_UA/
              Address.php
              Color.php
              Company.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            vi_VN/
              Address.php
              Color.php
              Internet.php
              Person.php
              PhoneNumber.php
            zh_CN/
              Address.php
              Color.php
              Company.php
              DateTime.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
            zh_TW/
              Address.php
              Color.php
              Company.php
              DateTime.php
              Internet.php
              Payment.php
              Person.php
              PhoneNumber.php
              Text.php
            Address.php
            Barcode.php
            Base.php
            Biased.php
            Color.php
            Company.php
            DateTime.php
            File.php
            HtmlLorem.php
            Image.php
            Internet.php
            Lorem.php
            Medical.php
            Miscellaneous.php
            Payment.php
            Person.php
            PhoneNumber.php
            Text.php
            UserAgent.php
            Uuid.php
          ChanceGenerator.php
          DefaultGenerator.php
          Documentor.php
          Factory.php
          Generator.php
          UniqueGenerator.php
          ValidGenerator.php
        autoload.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
      rector-migrate.php
  filp/
    whoops/
      src/
        Whoops/
          Exception/
            ErrorException.php
            Formatter.php
            Frame.php
            FrameCollection.php
            Inspector.php
          Handler/
            CallbackHandler.php
            Handler.php
            HandlerInterface.php
            JsonResponseHandler.php
            PlainTextHandler.php
            PrettyPageHandler.php
            XmlResponseHandler.php
          Inspector/
            InspectorFactory.php
            InspectorFactoryInterface.php
            InspectorInterface.php
          Resources/
            css/
              prism.css
              whoops.base.css
            js/
              clipboard.min.js
              prism.js
              whoops.base.js
              zepto.min.js
            views/
              env_details.html.php
              frame_code.html.php
              frame_list.html.php
              frames_container.html.php
              frames_description.html.php
              header_outer.html.php
              header.html.php
              layout.html.php
              panel_details_outer.html.php
              panel_details.html.php
              panel_left_outer.html.php
              panel_left.html.php
          Util/
            HtmlDumperOutput.php
            Misc.php
            SystemFacade.php
            TemplateHelper.php
          Run.php
          RunInterface.php
      .mailmap
      CHANGELOG.md
      composer.json
      LICENSE.md
      SECURITY.md
  fruitcake/
    php-cors/
      src/
        Exceptions/
          InvalidOptionException.php
        CorsService.php
      composer.json
      LICENSE
      README.md
  graham-campbell/
    result-type/
      src/
        Error.php
        Result.php
        Success.php
      composer.json
      LICENSE
  guzzlehttp/
    guzzle/
      src/
        Cookie/
          CookieJar.php
          CookieJarInterface.php
          FileCookieJar.php
          SessionCookieJar.php
          SetCookie.php
        Exception/
          BadResponseException.php
          ClientException.php
          ConnectException.php
          GuzzleException.php
          InvalidArgumentException.php
          RequestException.php
          ServerException.php
          TooManyRedirectsException.php
          TransferException.php
        Handler/
          CurlFactory.php
          CurlFactoryInterface.php
          CurlHandler.php
          CurlMultiHandler.php
          EasyHandle.php
          HeaderProcessor.php
          MockHandler.php
          Proxy.php
          StreamHandler.php
        BodySummarizer.php
        BodySummarizerInterface.php
        Client.php
        ClientInterface.php
        ClientTrait.php
        functions_include.php
        functions.php
        HandlerStack.php
        MessageFormatter.php
        MessageFormatterInterface.php
        Middleware.php
        Pool.php
        PrepareBodyMiddleware.php
        RedirectMiddleware.php
        RequestOptions.php
        RetryMiddleware.php
        TransferStats.php
        Utils.php
      CHANGELOG.md
      composer.json
      LICENSE
      package-lock.json
      README.md
      UPGRADING.md
    promises/
      src/
        AggregateException.php
        CancellationException.php
        Coroutine.php
        Create.php
        Each.php
        EachPromise.php
        FulfilledPromise.php
        Is.php
        Promise.php
        PromiseInterface.php
        PromisorInterface.php
        RejectedPromise.php
        RejectionException.php
        TaskQueue.php
        TaskQueueInterface.php
        Utils.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
    psr7/
      src/
        Exception/
          MalformedUriException.php
        AppendStream.php
        BufferStream.php
        CachingStream.php
        DroppingStream.php
        FnStream.php
        Header.php
        HttpFactory.php
        InflateStream.php
        LazyOpenStream.php
        LimitStream.php
        Message.php
        MessageTrait.php
        MimeType.php
        MultipartStream.php
        NoSeekStream.php
        PumpStream.php
        Query.php
        Request.php
        Response.php
        Rfc7230.php
        ServerRequest.php
        Stream.php
        StreamDecoratorTrait.php
        StreamWrapper.php
        UploadedFile.php
        Uri.php
        UriComparator.php
        UriNormalizer.php
        UriResolver.php
        Utils.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
    uri-template/
      src/
        UriTemplate.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
  hamcrest/
    hamcrest-php/
      generator/
        parts/
          file_header.txt
          functions_footer.txt
          functions_header.txt
          functions_imports.txt
          matchers_footer.txt
          matchers_header.txt
          matchers_imports.txt
        FactoryCall.php
        FactoryClass.php
        FactoryFile.php
        FactoryGenerator.php
        FactoryMethod.php
        FactoryParameter.php
        GlobalFunctionFile.php
        run.php
        StaticMethodFile.php
      hamcrest/
        Hamcrest/
          Arrays/
            IsArray.php
            IsArrayContaining.php
            IsArrayContainingInAnyOrder.php
            IsArrayContainingInOrder.php
            IsArrayContainingKey.php
            IsArrayContainingKeyValuePair.php
            IsArrayWithSize.php
            MatchingOnce.php
            SeriesMatchingOnce.php
          Collection/
            IsEmptyTraversable.php
            IsTraversableWithSize.php
          Core/
            AllOf.php
            AnyOf.php
            CombinableMatcher.php
            DescribedAs.php
            Every.php
            HasToString.php
            Is.php
            IsAnything.php
            IsCollectionContaining.php
            IsEqual.php
            IsIdentical.php
            IsInstanceOf.php
            IsNot.php
            IsNull.php
            IsSame.php
            IsTypeOf.php
            Set.php
            ShortcutCombination.php
          Internal/
            SelfDescribingValue.php
          Number/
            IsCloseTo.php
            OrderingComparison.php
          Text/
            IsEmptyString.php
            IsEqualIgnoringCase.php
            IsEqualIgnoringWhiteSpace.php
            MatchesPattern.php
            StringContains.php
            StringContainsIgnoringCase.php
            StringContainsInOrder.php
            StringEndsWith.php
            StringStartsWith.php
            SubstringMatcher.php
          Type/
            IsArray.php
            IsBoolean.php
            IsCallable.php
            IsDouble.php
            IsInteger.php
            IsNumeric.php
            IsObject.php
            IsResource.php
            IsScalar.php
            IsString.php
          Xml/
            HasXPath.php
          AssertionError.php
          BaseDescription.php
          BaseMatcher.php
          Description.php
          DiagnosingMatcher.php
          FeatureMatcher.php
          Matcher.php
          MatcherAssert.php
          Matchers.php
          NullDescription.php
          SelfDescribing.php
          StringDescription.php
          TypeSafeDiagnosingMatcher.php
          TypeSafeMatcher.php
          Util.php
        Hamcrest.php
      .gitattributes
      .gitignore
      CHANGES.txt
      composer.json
      CONTRIBUTING.md
      LICENSE.txt
      README.md
  laravel/
    framework/
      config/
        app.php
        auth.php
        broadcasting.php
        cache.php
        concurrency.php
        cors.php
        database.php
        filesystems.php
        hashing.php
        logging.php
        mail.php
        queue.php
        services.php
        session.php
        view.php
      config-stubs/
        app.php
      src/
        Illuminate/
          Auth/
            Access/
              Events/
                GateEvaluated.php
              AuthorizationException.php
              Gate.php
              HandlesAuthorization.php
              Response.php
            Console/
              stubs/
                make/
                  views/
                    layouts/
                      app.stub
              ClearResetsCommand.php
            Events/
              Attempting.php
              Authenticated.php
              CurrentDeviceLogout.php
              Failed.php
              Lockout.php
              Login.php
              Logout.php
              OtherDeviceLogout.php
              PasswordReset.php
              PasswordResetLinkSent.php
              Registered.php
              Validated.php
              Verified.php
            Listeners/
              SendEmailVerificationNotification.php
            Middleware/
              Authenticate.php
              AuthenticateWithBasicAuth.php
              Authorize.php
              EnsureEmailIsVerified.php
              RedirectIfAuthenticated.php
              RequirePassword.php
            Notifications/
              ResetPassword.php
              VerifyEmail.php
            Passwords/
              CacheTokenRepository.php
              CanResetPassword.php
              DatabaseTokenRepository.php
              PasswordBroker.php
              PasswordBrokerManager.php
              PasswordResetServiceProvider.php
              TokenRepositoryInterface.php
            Authenticatable.php
            AuthenticationException.php
            AuthManager.php
            AuthServiceProvider.php
            composer.json
            CreatesUserProviders.php
            DatabaseUserProvider.php
            EloquentUserProvider.php
            GenericUser.php
            GuardHelpers.php
            LICENSE.md
            MustVerifyEmail.php
            Recaller.php
            RequestGuard.php
            SessionGuard.php
            TokenGuard.php
          Broadcasting/
            Broadcasters/
              AblyBroadcaster.php
              Broadcaster.php
              LogBroadcaster.php
              NullBroadcaster.php
              PusherBroadcaster.php
              RedisBroadcaster.php
              UsePusherChannelConventions.php
            AnonymousEvent.php
            BroadcastController.php
            BroadcastEvent.php
            BroadcastException.php
            BroadcastManager.php
            BroadcastServiceProvider.php
            Channel.php
            composer.json
            EncryptedPrivateChannel.php
            FakePendingBroadcast.php
            InteractsWithBroadcasting.php
            InteractsWithSockets.php
            LICENSE.md
            PendingBroadcast.php
            PresenceChannel.php
            PrivateChannel.php
            UniqueBroadcastEvent.php
          Bus/
            Events/
              BatchDispatched.php
            Batch.php
            Batchable.php
            BatchFactory.php
            BatchRepository.php
            BusServiceProvider.php
            ChainedBatch.php
            composer.json
            DatabaseBatchRepository.php
            Dispatcher.php
            DynamoBatchRepository.php
            LICENSE.md
            PendingBatch.php
            PrunableBatchRepository.php
            Queueable.php
            UniqueLock.php
            UpdatedBatchJobCounts.php
          Cache/
            Console/
              stubs/
                cache.stub
              CacheTableCommand.php
              ClearCommand.php
              ForgetCommand.php
              PruneStaleTagsCommand.php
            Events/
              CacheEvent.php
              CacheFlushed.php
              CacheFlushFailed.php
              CacheFlushing.php
              CacheHit.php
              CacheMissed.php
              ForgettingKey.php
              KeyForgetFailed.php
              KeyForgotten.php
              KeyWriteFailed.php
              KeyWritten.php
              RetrievingKey.php
              RetrievingManyKeys.php
              WritingKey.php
              WritingManyKeys.php
            RateLimiting/
              GlobalLimit.php
              Limit.php
              Unlimited.php
            ApcStore.php
            ApcWrapper.php
            ArrayLock.php
            ArrayStore.php
            CacheLock.php
            CacheManager.php
            CacheServiceProvider.php
            composer.json
            DatabaseLock.php
            DatabaseStore.php
            DynamoDbLock.php
            DynamoDbStore.php
            FileLock.php
            FileStore.php
            HasCacheLock.php
            LICENSE.md
            Lock.php
            LuaScripts.php
            MemcachedConnector.php
            MemcachedLock.php
            MemcachedStore.php
            MemoizedStore.php
            NoLock.php
            NullStore.php
            PhpRedisLock.php
            RateLimiter.php
            RedisLock.php
            RedisStore.php
            RedisTaggedCache.php
            RedisTagSet.php
            Repository.php
            RetrievesMultipleKeys.php
            TaggableStore.php
            TaggedCache.php
            TagSet.php
          Collections/
            Traits/
              EnumeratesValues.php
              TransformsToResourceCollection.php
            Arr.php
            Collection.php
            composer.json
            Enumerable.php
            functions.php
            helpers.php
            HigherOrderCollectionProxy.php
            ItemNotFoundException.php
            LazyCollection.php
            LICENSE.md
            MultipleItemsFoundException.php
          Concurrency/
            Console/
              InvokeSerializedClosureCommand.php
            composer.json
            ConcurrencyManager.php
            ConcurrencyServiceProvider.php
            ForkDriver.php
            LICENSE.md
            ProcessDriver.php
            SyncDriver.php
          Conditionable/
            Traits/
              Conditionable.php
            composer.json
            HigherOrderWhenProxy.php
            LICENSE.md
          Config/
            composer.json
            LICENSE.md
            Repository.php
          Console/
            Concerns/
              CallsCommands.php
              ConfiguresPrompts.php
              CreatesMatchingTest.php
              HasParameters.php
              InteractsWithIO.php
              InteractsWithSignals.php
              PromptsForMissingInput.php
            Contracts/
              NewLineAware.php
            Events/
              ArtisanStarting.php
              CommandFinished.php
              CommandStarting.php
              ScheduledBackgroundTaskFinished.php
              ScheduledTaskFailed.php
              ScheduledTaskFinished.php
              ScheduledTaskSkipped.php
              ScheduledTaskStarting.php
            resources/
              views/
                components/
                  alert.php
                  bullet-list.php
                  line.php
                  two-column-detail.php
            Scheduling/
              CacheAware.php
              CacheEventMutex.php
              CacheSchedulingMutex.php
              CallbackEvent.php
              CommandBuilder.php
              Event.php
              EventMutex.php
              ManagesAttributes.php
              ManagesFrequencies.php
              PendingEventAttributes.php
              Schedule.php
              ScheduleClearCacheCommand.php
              ScheduleFinishCommand.php
              ScheduleInterruptCommand.php
              ScheduleListCommand.php
              ScheduleRunCommand.php
              ScheduleTestCommand.php
              ScheduleWorkCommand.php
              SchedulingMutex.php
            View/
              Components/
                Mutators/
                  EnsureDynamicContentIsHighlighted.php
                  EnsureNoPunctuation.php
                  EnsurePunctuation.php
                  EnsureRelativePaths.php
                Alert.php
                Ask.php
                AskWithCompletion.php
                BulletList.php
                Choice.php
                Component.php
                Confirm.php
                Error.php
                Factory.php
                Info.php
                Line.php
                Secret.php
                Success.php
                Task.php
                TwoColumnDetail.php
                Warn.php
              TaskResult.php
            Application.php
            BufferedConsoleOutput.php
            CacheCommandMutex.php
            Command.php
            CommandMutex.php
            composer.json
            ConfirmableTrait.php
            ContainerCommandLoader.php
            GeneratorCommand.php
            LICENSE.md
            ManuallyFailedException.php
            MigrationGeneratorCommand.php
            OutputStyle.php
            Parser.php
            Prohibitable.php
            PromptValidationException.php
            QuestionHelper.php
            Signals.php
          Container/
            Attributes/
              Auth.php
              Authenticated.php
              Bind.php
              Cache.php
              Config.php
              Context.php
              CurrentUser.php
              Database.php
              DB.php
              Give.php
              Log.php
              RouteParameter.php
              Scoped.php
              Singleton.php
              Storage.php
              Tag.php
            BoundMethod.php
            composer.json
            Container.php
            ContextualBindingBuilder.php
            EntryNotFoundException.php
            LICENSE.md
            RewindableGenerator.php
            Util.php
          Contracts/
            Auth/
              Access/
                Authorizable.php
                Gate.php
              Middleware/
                AuthenticatesRequests.php
              Authenticatable.php
              CanResetPassword.php
              Factory.php
              Guard.php
              MustVerifyEmail.php
              PasswordBroker.php
              PasswordBrokerFactory.php
              StatefulGuard.php
              SupportsBasicAuth.php
              UserProvider.php
            Broadcasting/
              Broadcaster.php
              Factory.php
              HasBroadcastChannel.php
              ShouldBeUnique.php
              ShouldBroadcast.php
              ShouldBroadcastNow.php
              ShouldRescue.php
            Bus/
              Dispatcher.php
              QueueingDispatcher.php
            Cache/
              Factory.php
              Lock.php
              LockProvider.php
              LockTimeoutException.php
              Repository.php
              Store.php
            Concurrency/
              Driver.php
            Config/
              Repository.php
            Console/
              Application.php
              Isolatable.php
              Kernel.php
              PromptsForMissingInput.php
            Container/
              BindingResolutionException.php
              CircularDependencyException.php
              Container.php
              ContextualAttribute.php
              ContextualBindingBuilder.php
              SelfBuilding.php
            Cookie/
              Factory.php
              QueueingFactory.php
            Database/
              Eloquent/
                Builder.php
                Castable.php
                CastsAttributes.php
                CastsInboundAttributes.php
                ComparesCastableAttributes.php
                DeviatesCastableAttributes.php
                SerializesCastableAttributes.php
                SupportsPartialRelations.php
              Events/
                MigrationEvent.php
              Query/
                Builder.php
                ConditionExpression.php
                Expression.php
              ConcurrencyErrorDetector.php
              LostConnectionDetector.php
              ModelIdentifier.php
            Debug/
              ExceptionHandler.php
              ShouldntReport.php
            Encryption/
              DecryptException.php
              Encrypter.php
              EncryptException.php
              StringEncrypter.php
            Events/
              Dispatcher.php
              ShouldDispatchAfterCommit.php
              ShouldHandleEventsAfterCommit.php
            Filesystem/
              Cloud.php
              Factory.php
              FileNotFoundException.php
              Filesystem.php
              LockTimeoutException.php
            Foundation/
              Application.php
              CachesConfiguration.php
              CachesRoutes.php
              ExceptionRenderer.php
              MaintenanceMode.php
            Hashing/
              Hasher.php
            Http/
              Kernel.php
            Log/
              ContextLogProcessor.php
            Mail/
              Attachable.php
              Factory.php
              Mailable.php
              Mailer.php
              MailQueue.php
            Notifications/
              Dispatcher.php
              Factory.php
            Pagination/
              CursorPaginator.php
              LengthAwarePaginator.php
              Paginator.php
            Pipeline/
              Hub.php
              Pipeline.php
            Process/
              InvokedProcess.php
              ProcessResult.php
            Queue/
              ClearableQueue.php
              EntityNotFoundException.php
              EntityResolver.php
              Factory.php
              Job.php
              Monitor.php
              Queue.php
              QueueableCollection.php
              QueueableEntity.php
              ShouldBeEncrypted.php
              ShouldBeUnique.php
              ShouldBeUniqueUntilProcessing.php
              ShouldQueue.php
              ShouldQueueAfterCommit.php
            Redis/
              Connection.php
              Connector.php
              Factory.php
              LimiterTimeoutException.php
            Routing/
              BindingRegistrar.php
              Registrar.php
              ResponseFactory.php
              UrlGenerator.php
              UrlRoutable.php
            Session/
              Middleware/
                AuthenticatesSessions.php
              Session.php
            Support/
              Arrayable.php
              CanBeEscapedWhenCastToString.php
              DeferrableProvider.php
              DeferringDisplayableValue.php
              HasOnceHash.php
              Htmlable.php
              Jsonable.php
              MessageBag.php
              MessageProvider.php
              Renderable.php
              Responsable.php
              ValidatedData.php
            Translation/
              HasLocalePreference.php
              Loader.php
              Translator.php
            Validation/
              CompilableRules.php
              DataAwareRule.php
              Factory.php
              ImplicitRule.php
              InvokableRule.php
              Rule.php
              UncompromisedVerifier.php
              ValidatesWhenResolved.php
              ValidationRule.php
              Validator.php
              ValidatorAwareRule.php
            View/
              Engine.php
              Factory.php
              View.php
              ViewCompilationException.php
            composer.json
            LICENSE.md
          Cookie/
            Middleware/
              AddQueuedCookiesToResponse.php
              EncryptCookies.php
            composer.json
            CookieJar.php
            CookieServiceProvider.php
            CookieValuePrefix.php
            LICENSE.md
          Database/
            Capsule/
              Manager.php
            Concerns/
              BuildsQueries.php
              BuildsWhereDateClauses.php
              CompilesJsonPaths.php
              ExplainsQueries.php
              ManagesTransactions.php
              ParsesSearchPath.php
            Connectors/
              ConnectionFactory.php
              Connector.php
              ConnectorInterface.php
              MariaDbConnector.php
              MySqlConnector.php
              PostgresConnector.php
              SQLiteConnector.php
              SqlServerConnector.php
            Console/
              Factories/
                stubs/
                  factory.stub
                FactoryMakeCommand.php
              Migrations/
                BaseCommand.php
                FreshCommand.php
                InstallCommand.php
                MigrateCommand.php
                MigrateMakeCommand.php
                RefreshCommand.php
                ResetCommand.php
                RollbackCommand.php
                StatusCommand.php
                TableGuesser.php
              Seeds/
                stubs/
                  seeder.stub
                SeedCommand.php
                SeederMakeCommand.php
                WithoutModelEvents.php
              DatabaseInspectionCommand.php
              DbCommand.php
              DumpCommand.php
              MonitorCommand.php
              PruneCommand.php
              ShowCommand.php
              ShowModelCommand.php
              TableCommand.php
              WipeCommand.php
            Eloquent/
              Attributes/
                Boot.php
                CollectedBy.php
                Initialize.php
                ObservedBy.php
                Scope.php
                ScopedBy.php
                UseEloquentBuilder.php
                UseFactory.php
                UsePolicy.php
              Casts/
                ArrayObject.php
                AsArrayObject.php
                AsCollection.php
                AsEncryptedArrayObject.php
                AsEncryptedCollection.php
                AsEnumArrayObject.php
                AsEnumCollection.php
                AsFluent.php
                AsHtmlString.php
                AsStringable.php
                AsUri.php
                Attribute.php
                Json.php
              Concerns/
                GuardsAttributes.php
                HasAttributes.php
                HasEvents.php
                HasGlobalScopes.php
                HasRelationships.php
                HasTimestamps.php
                HasUlids.php
                HasUniqueIds.php
                HasUniqueStringIds.php
                HasUuids.php
                HasVersion4Uuids.php
                HidesAttributes.php
                PreventsCircularRecursion.php
                QueriesRelationships.php
                TransformsToResource.php
              Factories/
                BelongsToManyRelationship.php
                BelongsToRelationship.php
                CrossJoinSequence.php
                Factory.php
                HasFactory.php
                Relationship.php
                Sequence.php
              Relations/
                Concerns/
                  AsPivot.php
                  CanBeOneOfMany.php
                  ComparesRelatedModels.php
                  InteractsWithDictionary.php
                  InteractsWithPivotTable.php
                  SupportsDefaultModels.php
                  SupportsInverseRelations.php
                BelongsTo.php
                BelongsToMany.php
                HasMany.php
                HasManyThrough.php
                HasOne.php
                HasOneOrMany.php
                HasOneOrManyThrough.php
                HasOneThrough.php
                MorphMany.php
                MorphOne.php
                MorphOneOrMany.php
                MorphPivot.php
                MorphTo.php
                MorphToMany.php
                Pivot.php
                Relation.php
              BroadcastableModelEventOccurred.php
              BroadcastsEvents.php
              BroadcastsEventsAfterCommit.php
              Builder.php
              Collection.php
              HasBuilder.php
              HasCollection.php
              HigherOrderBuilderProxy.php
              InvalidCastException.php
              JsonEncodingException.php
              MassAssignmentException.php
              MassPrunable.php
              MissingAttributeException.php
              Model.php
              ModelInspector.php
              ModelNotFoundException.php
              PendingHasThroughRelationship.php
              Prunable.php
              QueueEntityResolver.php
              RelationNotFoundException.php
              Scope.php
              SoftDeletes.php
              SoftDeletingScope.php
            Events/
              ConnectionEstablished.php
              ConnectionEvent.php
              DatabaseBusy.php
              DatabaseRefreshed.php
              MigrationEnded.php
              MigrationEvent.php
              MigrationsEnded.php
              MigrationsEvent.php
              MigrationsPruned.php
              MigrationsStarted.php
              MigrationStarted.php
              ModelPruningFinished.php
              ModelPruningStarting.php
              ModelsPruned.php
              NoPendingMigrations.php
              QueryExecuted.php
              SchemaDumped.php
              SchemaLoaded.php
              StatementPrepared.php
              TransactionBeginning.php
              TransactionCommitted.php
              TransactionCommitting.php
              TransactionRolledBack.php
            Migrations/
              stubs/
                migration.create.stub
                migration.stub
                migration.update.stub
              DatabaseMigrationRepository.php
              Migration.php
              MigrationCreator.php
              MigrationRepositoryInterface.php
              MigrationResult.php
              Migrator.php
            Query/
              Grammars/
                Grammar.php
                MariaDbGrammar.php
                MySqlGrammar.php
                PostgresGrammar.php
                SQLiteGrammar.php
                SqlServerGrammar.php
              Processors/
                MariaDbProcessor.php
                MySqlProcessor.php
                PostgresProcessor.php
                Processor.php
                SQLiteProcessor.php
                SqlServerProcessor.php
              Builder.php
              Expression.php
              IndexHint.php
              JoinClause.php
              JoinLateralClause.php
            Schema/
              Grammars/
                Grammar.php
                MariaDbGrammar.php
                MySqlGrammar.php
                PostgresGrammar.php
                SQLiteGrammar.php
                SqlServerGrammar.php
              Blueprint.php
              BlueprintState.php
              Builder.php
              ColumnDefinition.php
              ForeignIdColumnDefinition.php
              ForeignKeyDefinition.php
              IndexDefinition.php
              MariaDbBuilder.php
              MariaDbSchemaState.php
              MySqlBuilder.php
              MySqlSchemaState.php
              PostgresBuilder.php
              PostgresSchemaState.php
              SchemaState.php
              SQLiteBuilder.php
              SqliteSchemaState.php
              SqlServerBuilder.php
            ClassMorphViolationException.php
            composer.json
            ConcurrencyErrorDetector.php
            ConfigurationUrlParser.php
            Connection.php
            ConnectionInterface.php
            ConnectionResolver.php
            ConnectionResolverInterface.php
            DatabaseManager.php
            DatabaseServiceProvider.php
            DatabaseTransactionRecord.php
            DatabaseTransactionsManager.php
            DeadlockException.php
            DetectsConcurrencyErrors.php
            DetectsLostConnections.php
            Grammar.php
            LazyLoadingViolationException.php
            LICENSE.md
            LostConnectionDetector.php
            LostConnectionException.php
            MariaDbConnection.php
            MigrationServiceProvider.php
            MultipleColumnsSelectedException.php
            MultipleRecordsFoundException.php
            MySqlConnection.php
            PostgresConnection.php
            QueryException.php
            README.md
            RecordNotFoundException.php
            RecordsNotFoundException.php
            Seeder.php
            SQLiteConnection.php
            SQLiteDatabaseDoesNotExistException.php
            SqlServerConnection.php
            UniqueConstraintViolationException.php
          Encryption/
            composer.json
            Encrypter.php
            EncryptionServiceProvider.php
            LICENSE.md
            MissingAppKeyException.php
          Events/
            CallQueuedListener.php
            composer.json
            Dispatcher.php
            EventServiceProvider.php
            functions.php
            InvokeQueuedClosure.php
            LICENSE.md
            NullDispatcher.php
            QueuedClosure.php
          Filesystem/
            AwsS3V3Adapter.php
            composer.json
            Filesystem.php
            FilesystemAdapter.php
            FilesystemManager.php
            FilesystemServiceProvider.php
            functions.php
            LICENSE.md
            LocalFilesystemAdapter.php
            LockableFile.php
            ServeFile.php
          Foundation/
            Auth/
              Access/
                Authorizable.php
                AuthorizesRequests.php
              EmailVerificationRequest.php
              User.php
            Bootstrap/
              BootProviders.php
              HandleExceptions.php
              LoadConfiguration.php
              LoadEnvironmentVariables.php
              RegisterFacades.php
              RegisterProviders.php
              SetRequestForConsole.php
            Bus/
              Dispatchable.php
              DispatchesJobs.php
              PendingChain.php
              PendingClosureDispatch.php
              PendingDispatch.php
            Concerns/
              ResolvesDumpSource.php
            Configuration/
              ApplicationBuilder.php
              Exceptions.php
              Middleware.php
            Console/
              stubs/
                api-routes.stub
                broadcasting-routes.stub
                cast.inbound.stub
                cast.stub
                channel.stub
                class.invokable.stub
                class.stub
                config.stub
                console.stub
                echo-bootstrap-js.stub
                echo-js-ably.stub
                echo-js-pusher.stub
                echo-js-reverb.stub
                enum.backed.stub
                enum.stub
                event.stub
                exception-render-report.stub
                exception-render.stub
                exception-report.stub
                exception.stub
                interface.stub
                job.batched.queued.stub
                job.middleware.stub
                job.queued.stub
                job.stub
                listener.queued.stub
                listener.stub
                listener.typed.queued.stub
                listener.typed.stub
                mail.stub
                maintenance-mode.stub
                markdown-mail.stub
                markdown-notification.stub
                markdown.stub
                model.morph-pivot.stub
                model.pivot.stub
                model.stub
                notification.stub
                observer.plain.stub
                observer.stub
                pest.stub
                pest.unit.stub
                policy.plain.stub
                policy.stub
                provider.stub
                request.stub
                resource-collection.stub
                resource.stub
                routes.stub
                rule.implicit.stub
                rule.stub
                scope.stub
                test.stub
                test.unit.stub
                trait.stub
                view-component.stub
                view-mail.stub
                view.pest.stub
                view.stub
                view.test.stub
              AboutCommand.php
              ApiInstallCommand.php
              BroadcastingInstallCommand.php
              CastMakeCommand.php
              ChannelListCommand.php
              ChannelMakeCommand.php
              ClassMakeCommand.php
              ClearCompiledCommand.php
              CliDumper.php
              ClosureCommand.php
              ComponentMakeCommand.php
              ConfigCacheCommand.php
              ConfigClearCommand.php
              ConfigMakeCommand.php
              ConfigPublishCommand.php
              ConfigShowCommand.php
              ConsoleMakeCommand.php
              DocsCommand.php
              DownCommand.php
              EnumMakeCommand.php
              EnvironmentCommand.php
              EnvironmentDecryptCommand.php
              EnvironmentEncryptCommand.php
              EventCacheCommand.php
              EventClearCommand.php
              EventGenerateCommand.php
              EventListCommand.php
              EventMakeCommand.php
              ExceptionMakeCommand.php
              InteractsWithComposerPackages.php
              InterfaceMakeCommand.php
              JobMakeCommand.php
              JobMiddlewareMakeCommand.php
              Kernel.php
              KeyGenerateCommand.php
              LangPublishCommand.php
              ListenerMakeCommand.php
              MailMakeCommand.php
              ModelMakeCommand.php
              NotificationMakeCommand.php
              ObserverMakeCommand.php
              OptimizeClearCommand.php
              OptimizeCommand.php
              PackageDiscoverCommand.php
              PolicyMakeCommand.php
              ProviderMakeCommand.php
              QueuedCommand.php
              RequestMakeCommand.php
              ResourceMakeCommand.php
              RouteCacheCommand.php
              RouteClearCommand.php
              RouteListCommand.php
              RuleMakeCommand.php
              ScopeMakeCommand.php
              ServeCommand.php
              StorageLinkCommand.php
              StorageUnlinkCommand.php
              StubPublishCommand.php
              TestMakeCommand.php
              TraitMakeCommand.php
              UpCommand.php
              VendorPublishCommand.php
              ViewCacheCommand.php
              ViewClearCommand.php
              ViewMakeCommand.php
            Events/
              DiagnosingHealth.php
              DiscoverEvents.php
              Dispatchable.php
              LocaleUpdated.php
              MaintenanceModeDisabled.php
              MaintenanceModeEnabled.php
              PublishingStubs.php
              Terminating.php
              VendorTagPublished.php
            Exceptions/
              Renderer/
                Mappers/
                  BladeMapper.php
                Exception.php
                Frame.php
                Listener.php
                Renderer.php
              views/
                401.blade.php
                402.blade.php
                403.blade.php
                404.blade.php
                419.blade.php
                429.blade.php
                500.blade.php
                503.blade.php
                layout.blade.php
                minimal.blade.php
              Whoops/
                WhoopsExceptionRenderer.php
                WhoopsHandler.php
              Handler.php
              RegisterErrorViewPaths.php
              ReportableHandler.php
            Http/
              Events/
                RequestHandled.php
              Middleware/
                Concerns/
                  ExcludesPaths.php
                CheckForMaintenanceMode.php
                ConvertEmptyStringsToNull.php
                HandlePrecognitiveRequests.php
                InvokeDeferredCallbacks.php
                PreventRequestsDuringMaintenance.php
                TransformsRequest.php
                TrimStrings.php
                ValidateCsrfToken.php
                ValidatePostSize.php
                VerifyCsrfToken.php
              FormRequest.php
              HtmlDumper.php
              Kernel.php
              MaintenanceModeBypassCookie.php
            Providers/
              ArtisanServiceProvider.php
              ComposerServiceProvider.php
              ConsoleSupportServiceProvider.php
              FormRequestServiceProvider.php
              FoundationServiceProvider.php
            Queue/
              InteractsWithUniqueJobs.php
              Queueable.php
            resources/
              exceptions/
                renderer/
                  components/
                    icons/
                      chevron-down.blade.php
                      chevron-up.blade.php
                      computer-desktop.blade.php
                      moon.blade.php
                      sun.blade.php
                    card.blade.php
                    context.blade.php
                    copy-button.blade.php
                    editor.blade.php
                    header.blade.php
                    layout.blade.php
                    navigation.blade.php
                    theme-switcher.blade.php
                    trace-and-editor.blade.php
                    trace.blade.php
                  dark-mode.css
                  light-mode.css
                  markdown.blade.php
                  package-lock.json
                  package.json
                  postcss.config.js
                  scripts.js
                  show.blade.php
                  styles.css
                  tailwind.config.js
                  vite.config.js
              health-up.blade.php
              server.php
            Routing/
              PrecognitionCallableDispatcher.php
              PrecognitionControllerDispatcher.php
            stubs/
              facade.stub
            Support/
              Providers/
                AuthServiceProvider.php
                EventServiceProvider.php
                RouteServiceProvider.php
            Testing/
              Concerns/
                InteractsWithAuthentication.php
                InteractsWithConsole.php
                InteractsWithContainer.php
                InteractsWithDatabase.php
                InteractsWithDeprecationHandling.php
                InteractsWithExceptionHandling.php
                InteractsWithRedis.php
                InteractsWithSession.php
                InteractsWithTestCaseLifecycle.php
                InteractsWithTime.php
                InteractsWithViews.php
                MakesHttpRequests.php
                WithoutExceptionHandlingHandler.php
              Traits/
                CanConfigureMigrationCommands.php
              DatabaseMigrations.php
              DatabaseTransactions.php
              DatabaseTransactionsManager.php
              DatabaseTruncation.php
              LazilyRefreshDatabase.php
              RefreshDatabase.php
              RefreshDatabaseState.php
              TestCase.php
              WithConsoleEvents.php
              WithFaker.php
              WithoutMiddleware.php
              Wormhole.php
            Validation/
              ValidatesRequests.php
            AliasLoader.php
            Application.php
            CacheBasedMaintenanceMode.php
            Cloud.php
            ComposerScripts.php
            EnvironmentDetector.php
            FileBasedMaintenanceMode.php
            helpers.php
            Inspiring.php
            MaintenanceModeManager.php
            Mix.php
            MixFileNotFoundException.php
            MixManifestNotFoundException.php
            PackageManifest.php
            Precognition.php
            ProviderRepository.php
            Vite.php
            ViteException.php
            ViteManifestNotFoundException.php
          Hashing/
            AbstractHasher.php
            Argon2IdHasher.php
            ArgonHasher.php
            BcryptHasher.php
            composer.json
            HashManager.php
            HashServiceProvider.php
            LICENSE.md
          Http/
            Client/
              Concerns/
                DeterminesStatusCode.php
              Events/
                ConnectionFailed.php
                RequestSending.php
                ResponseReceived.php
              ConnectionException.php
              Factory.php
              HttpClientException.php
              PendingRequest.php
              Pool.php
              Request.php
              RequestException.php
              Response.php
              ResponseSequence.php
              StrayRequestException.php
            Concerns/
              CanBePrecognitive.php
              InteractsWithContentTypes.php
              InteractsWithFlashData.php
              InteractsWithInput.php
            Exceptions/
              HttpResponseException.php
              MalformedUrlException.php
              PostTooLargeException.php
              ThrottleRequestsException.php
            Middleware/
              AddLinkHeadersForPreloadedAssets.php
              CheckResponseForModifications.php
              FrameGuard.php
              HandleCors.php
              SetCacheHeaders.php
              TrustHosts.php
              TrustProxies.php
              ValidatePathEncoding.php
              ValidatePostSize.php
            Resources/
              Json/
                AnonymousResourceCollection.php
                JsonResource.php
                PaginatedResourceResponse.php
                ResourceCollection.php
                ResourceResponse.php
              CollectsResources.php
              ConditionallyLoadsAttributes.php
              DelegatesToResource.php
              MergeValue.php
              MissingValue.php
              PotentiallyMissing.php
            Testing/
              File.php
              FileFactory.php
              MimeType.php
            composer.json
            File.php
            FileHelpers.php
            JsonResponse.php
            LICENSE.md
            RedirectResponse.php
            Request.php
            Response.php
            ResponseTrait.php
            StreamedEvent.php
            UploadedFile.php
          Log/
            Context/
              Events/
                ContextDehydrating.php
                ContextHydrated.php
              ContextLogProcessor.php
              ContextServiceProvider.php
              Repository.php
            Events/
              MessageLogged.php
            composer.json
            functions.php
            LICENSE.md
            Logger.php
            LogManager.php
            LogServiceProvider.php
            ParsesLogConfiguration.php
          Macroable/
            Traits/
              Macroable.php
            composer.json
            LICENSE.md
          Mail/
            Events/
              MessageSending.php
              MessageSent.php
            Mailables/
              Address.php
              Attachment.php
              Content.php
              Envelope.php
              Headers.php
            resources/
              views/
                html/
                  themes/
                    default.css
                  button.blade.php
                  footer.blade.php
                  header.blade.php
                  layout.blade.php
                  message.blade.php
                  panel.blade.php
                  subcopy.blade.php
                  table.blade.php
                text/
                  button.blade.php
                  footer.blade.php
                  header.blade.php
                  layout.blade.php
                  message.blade.php
                  panel.blade.php
                  subcopy.blade.php
                  table.blade.php
            Transport/
              ArrayTransport.php
              LogTransport.php
              ResendTransport.php
              SesTransport.php
              SesV2Transport.php
            Attachment.php
            composer.json
            LICENSE.md
            Mailable.php
            Mailer.php
            MailManager.php
            MailServiceProvider.php
            Markdown.php
            Message.php
            PendingMail.php
            SendQueuedMailable.php
            SentMessage.php
            TextMessage.php
          Notifications/
            Channels/
              BroadcastChannel.php
              DatabaseChannel.php
              MailChannel.php
            Console/
              stubs/
                notifications.stub
              NotificationTableCommand.php
            Events/
              BroadcastNotificationCreated.php
              NotificationFailed.php
              NotificationSending.php
              NotificationSent.php
            Messages/
              BroadcastMessage.php
              DatabaseMessage.php
              MailMessage.php
              SimpleMessage.php
            resources/
              views/
                email.blade.php
            Action.php
            AnonymousNotifiable.php
            ChannelManager.php
            composer.json
            DatabaseNotification.php
            DatabaseNotificationCollection.php
            HasDatabaseNotifications.php
            LICENSE.md
            Notifiable.php
            Notification.php
            NotificationSender.php
            NotificationServiceProvider.php
            RoutesNotifications.php
            SendQueuedNotifications.php
          Pagination/
            resources/
              views/
                bootstrap-4.blade.php
                bootstrap-5.blade.php
                default.blade.php
                semantic-ui.blade.php
                simple-bootstrap-4.blade.php
                simple-bootstrap-5.blade.php
                simple-default.blade.php
                simple-tailwind.blade.php
                tailwind.blade.php
            AbstractCursorPaginator.php
            AbstractPaginator.php
            composer.json
            Cursor.php
            CursorPaginator.php
            LengthAwarePaginator.php
            LICENSE.md
            PaginationServiceProvider.php
            PaginationState.php
            Paginator.php
            UrlWindow.php
          Pipeline/
            composer.json
            Hub.php
            LICENSE.md
            Pipeline.php
            PipelineServiceProvider.php
          Process/
            Exceptions/
              ProcessFailedException.php
              ProcessTimedOutException.php
            composer.json
            Factory.php
            FakeInvokedProcess.php
            FakeProcessDescription.php
            FakeProcessResult.php
            FakeProcessSequence.php
            InvokedProcess.php
            InvokedProcessPool.php
            LICENSE.md
            PendingProcess.php
            Pipe.php
            Pool.php
            ProcessPoolResults.php
            ProcessResult.php
          Queue/
            Attributes/
              DeleteWhenMissingModels.php
              WithoutRelations.php
            Capsule/
              Manager.php
            Connectors/
              BeanstalkdConnector.php
              ConnectorInterface.php
              DatabaseConnector.php
              NullConnector.php
              RedisConnector.php
              SqsConnector.php
              SyncConnector.php
            Console/
              stubs/
                batches.stub
                failed_jobs.stub
                jobs.stub
              BatchesTableCommand.php
              ClearCommand.php
              FailedTableCommand.php
              FlushFailedCommand.php
              ForgetFailedCommand.php
              ListenCommand.php
              ListFailedCommand.php
              MonitorCommand.php
              PruneBatchesCommand.php
              PruneFailedJobsCommand.php
              RestartCommand.php
              RetryBatchCommand.php
              RetryCommand.php
              TableCommand.php
              WorkCommand.php
            Events/
              JobAttempted.php
              JobExceptionOccurred.php
              JobFailed.php
              JobPopped.php
              JobPopping.php
              JobProcessed.php
              JobProcessing.php
              JobQueued.php
              JobQueueing.php
              JobReleasedAfterException.php
              JobRetryRequested.php
              JobTimedOut.php
              Looping.php
              QueueBusy.php
              WorkerStarting.php
              WorkerStopping.php
            Failed/
              CountableFailedJobProvider.php
              DatabaseFailedJobProvider.php
              DatabaseUuidFailedJobProvider.php
              DynamoDbFailedJobProvider.php
              FailedJobProviderInterface.php
              FileFailedJobProvider.php
              NullFailedJobProvider.php
              PrunableFailedJobProvider.php
            Jobs/
              BeanstalkdJob.php
              DatabaseJob.php
              DatabaseJobRecord.php
              FakeJob.php
              Job.php
              JobName.php
              RedisJob.php
              SqsJob.php
              SyncJob.php
            Middleware/
              FailOnException.php
              RateLimited.php
              RateLimitedWithRedis.php
              Skip.php
              SkipIfBatchCancelled.php
              ThrottlesExceptions.php
              ThrottlesExceptionsWithRedis.php
              WithoutOverlapping.php
            BeanstalkdQueue.php
            CallQueuedClosure.php
            CallQueuedHandler.php
            composer.json
            DatabaseQueue.php
            InteractsWithQueue.php
            InvalidPayloadException.php
            LICENSE.md
            Listener.php
            ListenerOptions.php
            LuaScripts.php
            ManuallyFailedException.php
            MaxAttemptsExceededException.php
            NullQueue.php
            Queue.php
            QueueManager.php
            QueueServiceProvider.php
            README.md
            RedisQueue.php
            SerializesAndRestoresModelIdentifiers.php
            SerializesModels.php
            SqsQueue.php
            SyncQueue.php
            TimeoutExceededException.php
            Worker.php
            WorkerOptions.php
          Redis/
            Connections/
              Connection.php
              PacksPhpRedisValues.php
              PhpRedisClusterConnection.php
              PhpRedisConnection.php
              PredisClusterConnection.php
              PredisConnection.php
            Connectors/
              PhpRedisConnector.php
              PredisConnector.php
            Events/
              CommandExecuted.php
            Limiters/
              ConcurrencyLimiter.php
              ConcurrencyLimiterBuilder.php
              DurationLimiter.php
              DurationLimiterBuilder.php
            composer.json
            LICENSE.md
            RedisManager.php
            RedisServiceProvider.php
          Routing/
            Console/
              stubs/
                controller.api.stub
                controller.invokable.stub
                controller.model.api.stub
                controller.model.stub
                controller.nested.api.stub
                controller.nested.singleton.api.stub
                controller.nested.singleton.stub
                controller.nested.stub
                controller.plain.stub
                controller.singleton.api.stub
                controller.singleton.stub
                controller.stub
                middleware.stub
              ControllerMakeCommand.php
              MiddlewareMakeCommand.php
            Contracts/
              CallableDispatcher.php
              ControllerDispatcher.php
            Controllers/
              HasMiddleware.php
              Middleware.php
            Events/
              PreparingResponse.php
              ResponsePrepared.php
              RouteMatched.php
              Routing.php
            Exceptions/
              BackedEnumCaseNotFoundException.php
              InvalidSignatureException.php
              MissingRateLimiterException.php
              StreamedResponseException.php
              UrlGenerationException.php
            Matching/
              HostValidator.php
              MethodValidator.php
              SchemeValidator.php
              UriValidator.php
              ValidatorInterface.php
            Middleware/
              SubstituteBindings.php
              ThrottleRequests.php
              ThrottleRequestsWithRedis.php
              ValidateSignature.php
            AbstractRouteCollection.php
            CallableDispatcher.php
            CompiledRouteCollection.php
            composer.json
            Controller.php
            ControllerDispatcher.php
            ControllerMiddlewareOptions.php
            CreatesRegularExpressionRouteConstraints.php
            FiltersControllerMiddleware.php
            ImplicitRouteBinding.php
            LICENSE.md
            MiddlewareNameResolver.php
            PendingResourceRegistration.php
            PendingSingletonResourceRegistration.php
            Pipeline.php
            RedirectController.php
            Redirector.php
            ResolvesRouteDependencies.php
            ResourceRegistrar.php
            ResponseFactory.php
            Route.php
            RouteAction.php
            RouteBinding.php
            RouteCollection.php
            RouteCollectionInterface.php
            RouteDependencyResolverTrait.php
            RouteFileRegistrar.php
            RouteGroup.php
            RouteParameterBinder.php
            Router.php
            RouteRegistrar.php
            RouteSignatureParameters.php
            RouteUri.php
            RouteUrlGenerator.php
            RoutingServiceProvider.php
            SortedMiddleware.php
            UrlGenerator.php
            ViewController.php
          Session/
            Console/
              stubs/
                database.stub
              SessionTableCommand.php
            Middleware/
              AuthenticateSession.php
              StartSession.php
            ArraySessionHandler.php
            CacheBasedSessionHandler.php
            composer.json
            CookieSessionHandler.php
            DatabaseSessionHandler.php
            EncryptedStore.php
            ExistenceAwareInterface.php
            FileSessionHandler.php
            LICENSE.md
            NullSessionHandler.php
            SessionManager.php
            SessionServiceProvider.php
            Store.php
            SymfonySessionDecorator.php
            TokenMismatchException.php
          Support/
            Defer/
              DeferredCallback.php
              DeferredCallbackCollection.php
            Exceptions/
              MathException.php
            Facades/
              App.php
              Artisan.php
              Auth.php
              Blade.php
              Broadcast.php
              Bus.php
              Cache.php
              Concurrency.php
              Config.php
              Context.php
              Cookie.php
              Crypt.php
              Date.php
              DB.php
              Event.php
              Exceptions.php
              Facade.php
              File.php
              Gate.php
              Hash.php
              Http.php
              Lang.php
              Log.php
              Mail.php
              MaintenanceMode.php
              Notification.php
              ParallelTesting.php
              Password.php
              Pipeline.php
              Process.php
              Queue.php
              RateLimiter.php
              Redirect.php
              Redis.php
              Request.php
              Response.php
              Route.php
              Schedule.php
              Schema.php
              Session.php
              Storage.php
              URL.php
              Validator.php
              View.php
              Vite.php
            Testing/
              Fakes/
                BatchFake.php
                BatchRepositoryFake.php
                BusFake.php
                ChainedBatchTruthTest.php
                EventFake.php
                ExceptionHandlerFake.php
                Fake.php
                MailFake.php
                NotificationFake.php
                PendingBatchFake.php
                PendingChainFake.php
                PendingMailFake.php
                QueueFake.php
            Traits/
              CapsuleManagerTrait.php
              Dumpable.php
              ForwardsCalls.php
              InteractsWithData.php
              Localizable.php
              ReflectsClosures.php
              Tappable.php
            AggregateServiceProvider.php
            Benchmark.php
            Carbon.php
            composer.json
            Composer.php
            ConfigurationUrlParser.php
            DateFactory.php
            DefaultProviders.php
            EncodedHtmlString.php
            Env.php
            Fluent.php
            functions.php
            helpers.php
            HigherOrderTapProxy.php
            HtmlString.php
            InteractsWithTime.php
            Js.php
            LICENSE.md
            Lottery.php
            Manager.php
            MessageBag.php
            MultipleInstanceManager.php
            NamespacedItemResolver.php
            Number.php
            Once.php
            Onceable.php
            Optional.php
            Pluralizer.php
            ProcessUtils.php
            Reflector.php
            ServiceProvider.php
            Sleep.php
            Str.php
            Stringable.php
            Timebox.php
            Uri.php
            UriQueryString.php
            ValidatedInput.php
            ViewErrorBag.php
          Testing/
            Concerns/
              AssertsStatusCodes.php
              RunsInParallel.php
              TestDatabases.php
            Constraints/
              ArraySubset.php
              CountInDatabase.php
              HasInDatabase.php
              NotSoftDeletedInDatabase.php
              SeeInOrder.php
              SoftDeletedInDatabase.php
            Exceptions/
              InvalidArgumentException.php
            Fluent/
              Concerns/
                Debugging.php
                Has.php
                Interaction.php
                Matching.php
              AssertableJson.php
            Assert.php
            AssertableJsonString.php
            composer.json
            LICENSE.md
            LoggedExceptionCollection.php
            ParallelConsoleOutput.php
            ParallelRunner.php
            ParallelTesting.php
            ParallelTestingServiceProvider.php
            PendingCommand.php
            TestComponent.php
            TestResponse.php
            TestResponseAssert.php
            TestView.php
          Translation/
            lang/
              en/
                auth.php
                pagination.php
                passwords.php
                validation.php
            ArrayLoader.php
            composer.json
            CreatesPotentiallyTranslatedStrings.php
            FileLoader.php
            LICENSE.md
            MessageSelector.php
            PotentiallyTranslatedString.php
            TranslationServiceProvider.php
            Translator.php
          Validation/
            Concerns/
              FilterEmailValidation.php
              FormatsMessages.php
              ReplacesAttributes.php
              ValidatesAttributes.php
            Rules/
              AnyOf.php
              ArrayRule.php
              Can.php
              Contains.php
              DatabaseRule.php
              Date.php
              Dimensions.php
              DoesntContain.php
              Email.php
              Enum.php
              ExcludeIf.php
              Exists.php
              File.php
              ImageFile.php
              In.php
              NotIn.php
              Numeric.php
              Password.php
              ProhibitedIf.php
              RequiredIf.php
              Unique.php
            ClosureValidationRule.php
            composer.json
            ConditionalRules.php
            DatabasePresenceVerifier.php
            DatabasePresenceVerifierInterface.php
            Factory.php
            InvokableValidationRule.php
            LICENSE.md
            NestedRules.php
            NotPwnedVerifier.php
            PresenceVerifierInterface.php
            Rule.php
            UnauthorizedException.php
            ValidatesWhenResolvedTrait.php
            ValidationData.php
            ValidationException.php
            ValidationRuleParser.php
            ValidationServiceProvider.php
            Validator.php
          View/
            Compilers/
              Concerns/
                CompilesAuthorizations.php
                CompilesClasses.php
                CompilesComments.php
                CompilesComponents.php
                CompilesConditionals.php
                CompilesContexts.php
                CompilesEchos.php
                CompilesErrors.php
                CompilesFragments.php
                CompilesHelpers.php
                CompilesIncludes.php
                CompilesInjections.php
                CompilesJs.php
                CompilesJson.php
                CompilesLayouts.php
                CompilesLoops.php
                CompilesRawPhp.php
                CompilesSessions.php
                CompilesStacks.php
                CompilesStyles.php
                CompilesTranslations.php
                CompilesUseStatements.php
              BladeCompiler.php
              Compiler.php
              CompilerInterface.php
              ComponentTagCompiler.php
            Concerns/
              ManagesComponents.php
              ManagesEvents.php
              ManagesFragments.php
              ManagesLayouts.php
              ManagesLoops.php
              ManagesStacks.php
              ManagesTranslations.php
            Engines/
              CompilerEngine.php
              Engine.php
              EngineResolver.php
              FileEngine.php
              PhpEngine.php
            Middleware/
              ShareErrorsFromSession.php
            AnonymousComponent.php
            AppendableAttributeValue.php
            Component.php
            ComponentAttributeBag.php
            ComponentSlot.php
            composer.json
            DynamicComponent.php
            Factory.php
            FileViewFinder.php
            InvokableComponentVariable.php
            LICENSE.md
            View.php
            ViewException.php
            ViewFinderInterface.php
            ViewName.php
            ViewServiceProvider.php
      composer.json
      LICENSE.md
      pint.json
      README.md
    pail/
      src/
        Console/
          Commands/
            PailCommand.php
        Contracts/
          Printer.php
        Guards/
          EnsurePcntlIsAvailable.php
        Printers/
          CliPrinter.php
        ValueObjects/
          Origin/
            Console.php
            Http.php
            Queue.php
          MessageLogged.php
        File.php
        Files.php
        Handler.php
        LoggerFactory.php
        Options.php
        PailServiceProvider.php
        ProcessFactory.php
      composer.json
      LICENSE.md
    pint/
      builds/
        pint
      overrides/
        Runner/
          Parallel/
            ProcessFactory.php
      composer.json
      LICENSE.md
    prompts/
      src/
        Concerns/
          Colors.php
          Cursor.php
          Erase.php
          Events.php
          FakesInputOutput.php
          Fallback.php
          Interactivity.php
          Scrolling.php
          Termwind.php
          Themes.php
          Truncation.php
          TypedValue.php
        Exceptions/
          FormRevertedException.php
          NonInteractiveValidationException.php
        Output/
          BufferedConsoleOutput.php
          ConsoleOutput.php
        Support/
          Result.php
          Utils.php
        Themes/
          Contracts/
            Scrolling.php
          Default/
            Concerns/
              DrawsBoxes.php
              DrawsScrollbars.php
              InteractsWithStrings.php
            ClearRenderer.php
            ConfirmPromptRenderer.php
            MultiSearchPromptRenderer.php
            MultiSelectPromptRenderer.php
            NoteRenderer.php
            PasswordPromptRenderer.php
            PausePromptRenderer.php
            ProgressRenderer.php
            Renderer.php
            SearchPromptRenderer.php
            SelectPromptRenderer.php
            SpinnerRenderer.php
            SuggestPromptRenderer.php
            TableRenderer.php
            TextareaPromptRenderer.php
            TextPromptRenderer.php
        Clear.php
        ConfirmPrompt.php
        FormBuilder.php
        FormStep.php
        helpers.php
        Key.php
        MultiSearchPrompt.php
        MultiSelectPrompt.php
        Note.php
        PasswordPrompt.php
        PausePrompt.php
        Progress.php
        Prompt.php
        SearchPrompt.php
        SelectPrompt.php
        Spinner.php
        SuggestPrompt.php
        Table.php
        Terminal.php
        TextareaPrompt.php
        TextPrompt.php
      composer.json
      LICENSE.md
      phpunit.xml
      README.md
    sail/
      bin/
        sail
      database/
        mariadb/
          create-testing-database.sh
        mysql/
          create-testing-database.sh
        pgsql/
          create-testing-database.sql
      runtimes/
        8.0/
          Dockerfile
          php.ini
          start-container
          supervisord.conf
        8.1/
          Dockerfile
          php.ini
          start-container
          supervisord.conf
        8.2/
          Dockerfile
          php.ini
          start-container
          supervisord.conf
        8.3/
          Dockerfile
          php.ini
          start-container
          supervisord.conf
        8.4/
          Dockerfile
          php.ini
          start-container
          supervisord.conf
      src/
        Console/
          Concerns/
            InteractsWithDockerComposeServices.php
          AddCommand.php
          InstallCommand.php
          PublishCommand.php
        SailServiceProvider.php
      stubs/
        devcontainer.stub
        docker-compose.stub
        mailpit.stub
        mariadb.stub
        meilisearch.stub
        memcached.stub
        minio.stub
        mongodb.stub
        mysql.stub
        pgsql.stub
        rabbitmq.stub
        redis.stub
        selenium.stub
        soketi.stub
        typesense.stub
        valkey.stub
      composer.json
      LICENSE.md
      README.md
    sanctum/
      config/
        sanctum.php
      database/
        migrations/
          2019_12_14_000001_create_personal_access_tokens_table.php
      src/
        Console/
          Commands/
            PruneExpired.php
        Contracts/
          HasAbilities.php
          HasApiTokens.php
        Events/
          TokenAuthenticated.php
        Exceptions/
          MissingAbilityException.php
          MissingScopeException.php
        Http/
          Controllers/
            CsrfCookieController.php
          Middleware/
            AuthenticateSession.php
            CheckAbilities.php
            CheckForAnyAbility.php
            CheckForAnyScope.php
            CheckScopes.php
            EnsureFrontendRequestsAreStateful.php
        Guard.php
        HasApiTokens.php
        NewAccessToken.php
        PersonalAccessToken.php
        Sanctum.php
        SanctumServiceProvider.php
        TransientToken.php
      composer.json
      LICENSE.md
      README.md
      testbench.yaml
      UPGRADE.md
    serializable-closure/
      src/
        Contracts/
          Serializable.php
          Signer.php
        Exceptions/
          InvalidSignatureException.php
          MissingSecretKeyException.php
          PhpVersionNotSupportedException.php
        Serializers/
          Native.php
          Signed.php
        Signers/
          Hmac.php
        Support/
          ClosureScope.php
          ClosureStream.php
          ReflectionClosure.php
          SelfReference.php
        SerializableClosure.php
        UnsignedSerializableClosure.php
      composer.json
      LICENSE.md
      README.md
    tinker/
      config/
        tinker.php
      src/
        Console/
          TinkerCommand.php
        ClassAliasAutoloader.php
        TinkerCaster.php
        TinkerServiceProvider.php
      composer.json
      LICENSE.md
      README.md
  league/
    commonmark/
      src/
        Delimiter/
          Processor/
            CacheableDelimiterProcessorInterface.php
            DelimiterProcessorCollection.php
            DelimiterProcessorCollectionInterface.php
            DelimiterProcessorInterface.php
            StaggeredDelimiterProcessor.php
          Bracket.php
          Delimiter.php
          DelimiterInterface.php
          DelimiterParser.php
          DelimiterStack.php
        Environment/
          Environment.php
          EnvironmentAwareInterface.php
          EnvironmentBuilderInterface.php
          EnvironmentInterface.php
        Event/
          AbstractEvent.php
          DocumentParsedEvent.php
          DocumentPreParsedEvent.php
          DocumentPreRenderEvent.php
          DocumentRenderedEvent.php
          ListenerData.php
        Exception/
          AlreadyInitializedException.php
          CommonMarkException.php
          InvalidArgumentException.php
          IOException.php
          LogicException.php
          MissingDependencyException.php
          UnexpectedEncodingException.php
        Extension/
          Attributes/
            Event/
              AttributesListener.php
            Node/
              Attributes.php
              AttributesInline.php
            Parser/
              AttributesBlockContinueParser.php
              AttributesBlockStartParser.php
              AttributesInlineParser.php
            Util/
              AttributesHelper.php
            AttributesExtension.php
          Autolink/
            AutolinkExtension.php
            EmailAutolinkParser.php
            UrlAutolinkParser.php
          CommonMark/
            Delimiter/
              Processor/
                EmphasisDelimiterProcessor.php
            Node/
              Block/
                BlockQuote.php
                FencedCode.php
                Heading.php
                HtmlBlock.php
                IndentedCode.php
                ListBlock.php
                ListData.php
                ListItem.php
                ThematicBreak.php
              Inline/
                AbstractWebResource.php
                Code.php
                Emphasis.php
                HtmlInline.php
                Image.php
                Link.php
                Strong.php
            Parser/
              Block/
                BlockQuoteParser.php
                BlockQuoteStartParser.php
                FencedCodeParser.php
                FencedCodeStartParser.php
                HeadingParser.php
                HeadingStartParser.php
                HtmlBlockParser.php
                HtmlBlockStartParser.php
                IndentedCodeParser.php
                IndentedCodeStartParser.php
                ListBlockParser.php
                ListBlockStartParser.php
                ListItemParser.php
                ThematicBreakParser.php
                ThematicBreakStartParser.php
              Inline/
                AutolinkParser.php
                BacktickParser.php
                BangParser.php
                CloseBracketParser.php
                EntityParser.php
                EscapableParser.php
                HtmlInlineParser.php
                OpenBracketParser.php
            Renderer/
              Block/
                BlockQuoteRenderer.php
                FencedCodeRenderer.php
                HeadingRenderer.php
                HtmlBlockRenderer.php
                IndentedCodeRenderer.php
                ListBlockRenderer.php
                ListItemRenderer.php
                ThematicBreakRenderer.php
              Inline/
                CodeRenderer.php
                EmphasisRenderer.php
                HtmlInlineRenderer.php
                ImageRenderer.php
                LinkRenderer.php
                StrongRenderer.php
            CommonMarkCoreExtension.php
          DefaultAttributes/
            ApplyDefaultAttributesProcessor.php
            DefaultAttributesExtension.php
          DescriptionList/
            Event/
              ConsecutiveDescriptionListMerger.php
              LooseDescriptionHandler.php
            Node/
              Description.php
              DescriptionList.php
              DescriptionTerm.php
            Parser/
              DescriptionContinueParser.php
              DescriptionListContinueParser.php
              DescriptionStartParser.php
              DescriptionTermContinueParser.php
            Renderer/
              DescriptionListRenderer.php
              DescriptionRenderer.php
              DescriptionTermRenderer.php
            DescriptionListExtension.php
          DisallowedRawHtml/
            DisallowedRawHtmlExtension.php
            DisallowedRawHtmlRenderer.php
          Embed/
            Bridge/
              OscaroteroEmbedAdapter.php
            DomainFilteringAdapter.php
            Embed.php
            EmbedAdapterInterface.php
            EmbedExtension.php
            EmbedParser.php
            EmbedProcessor.php
            EmbedRenderer.php
            EmbedStartParser.php
          ExternalLink/
            ExternalLinkExtension.php
            ExternalLinkProcessor.php
          Footnote/
            Event/
              AnonymousFootnotesListener.php
              FixOrphanedFootnotesAndRefsListener.php
              GatherFootnotesListener.php
              NumberFootnotesListener.php
            Node/
              Footnote.php
              FootnoteBackref.php
              FootnoteContainer.php
              FootnoteRef.php
            Parser/
              AnonymousFootnoteRefParser.php
              FootnoteParser.php
              FootnoteRefParser.php
              FootnoteStartParser.php
            Renderer/
              FootnoteBackrefRenderer.php
              FootnoteContainerRenderer.php
              FootnoteRefRenderer.php
              FootnoteRenderer.php
            FootnoteExtension.php
          FrontMatter/
            Data/
              FrontMatterDataParserInterface.php
              LibYamlFrontMatterParser.php
              SymfonyYamlFrontMatterParser.php
            Exception/
              InvalidFrontMatterException.php
            Input/
              MarkdownInputWithFrontMatter.php
            Listener/
              FrontMatterPostRenderListener.php
              FrontMatterPreParser.php
            Output/
              RenderedContentWithFrontMatter.php
            FrontMatterExtension.php
            FrontMatterParser.php
            FrontMatterParserInterface.php
            FrontMatterProviderInterface.php
          HeadingPermalink/
            HeadingPermalink.php
            HeadingPermalinkExtension.php
            HeadingPermalinkProcessor.php
            HeadingPermalinkRenderer.php
          InlinesOnly/
            ChildRenderer.php
            InlinesOnlyExtension.php
          Mention/
            Generator/
              CallbackGenerator.php
              MentionGeneratorInterface.php
              StringTemplateLinkGenerator.php
            Mention.php
            MentionExtension.php
            MentionParser.php
          SmartPunct/
            DashParser.php
            EllipsesParser.php
            Quote.php
            QuoteParser.php
            QuoteProcessor.php
            ReplaceUnpairedQuotesListener.php
            SmartPunctExtension.php
          Strikethrough/
            Strikethrough.php
            StrikethroughDelimiterProcessor.php
            StrikethroughExtension.php
            StrikethroughRenderer.php
          Table/
            Table.php
            TableCell.php
            TableCellRenderer.php
            TableExtension.php
            TableParser.php
            TableRenderer.php
            TableRow.php
            TableRowRenderer.php
            TableSection.php
            TableSectionRenderer.php
            TableStartParser.php
          TableOfContents/
            Node/
              TableOfContents.php
              TableOfContentsPlaceholder.php
            Normalizer/
              AsIsNormalizerStrategy.php
              FlatNormalizerStrategy.php
              NormalizerStrategyInterface.php
              RelativeNormalizerStrategy.php
            TableOfContentsBuilder.php
            TableOfContentsExtension.php
            TableOfContentsGenerator.php
            TableOfContentsGeneratorInterface.php
            TableOfContentsPlaceholderParser.php
            TableOfContentsPlaceholderRenderer.php
            TableOfContentsRenderer.php
          TaskList/
            TaskListExtension.php
            TaskListItemMarker.php
            TaskListItemMarkerParser.php
            TaskListItemMarkerRenderer.php
          ConfigurableExtensionInterface.php
          ExtensionInterface.php
          GithubFlavoredMarkdownExtension.php
        Input/
          MarkdownInput.php
          MarkdownInputInterface.php
        Node/
          Block/
            AbstractBlock.php
            Document.php
            Paragraph.php
            TightBlockInterface.php
          Inline/
            AbstractInline.php
            AbstractStringContainer.php
            AdjacentTextMerger.php
            DelimitedInterface.php
            Newline.php
            Text.php
          Query/
            AndExpr.php
            ExpressionInterface.php
            OrExpr.php
          Node.php
          NodeIterator.php
          NodeWalker.php
          NodeWalkerEvent.php
          Query.php
          RawMarkupContainerInterface.php
          StringContainerHelper.php
          StringContainerInterface.php
        Normalizer/
          SlugNormalizer.php
          TextNormalizer.php
          TextNormalizerInterface.php
          UniqueSlugNormalizer.php
          UniqueSlugNormalizerInterface.php
        Output/
          RenderedContent.php
          RenderedContentInterface.php
        Parser/
          Block/
            AbstractBlockContinueParser.php
            BlockContinue.php
            BlockContinueParserInterface.php
            BlockContinueParserWithInlinesInterface.php
            BlockStart.php
            BlockStartParserInterface.php
            DocumentBlockParser.php
            ParagraphParser.php
            SkipLinesStartingWithLettersParser.php
          Inline/
            InlineParserInterface.php
            InlineParserMatch.php
            NewlineParser.php
          Cursor.php
          CursorState.php
          InlineParserContext.php
          InlineParserEngine.php
          InlineParserEngineInterface.php
          MarkdownParser.php
          MarkdownParserInterface.php
          MarkdownParserState.php
          MarkdownParserStateInterface.php
          ParserLogicException.php
        Reference/
          MemoryLimitedReferenceMap.php
          Reference.php
          ReferenceableInterface.php
          ReferenceInterface.php
          ReferenceMap.php
          ReferenceMapInterface.php
          ReferenceParser.php
        Renderer/
          Block/
            DocumentRenderer.php
            ParagraphRenderer.php
          Inline/
            NewlineRenderer.php
            TextRenderer.php
          ChildNodeRendererInterface.php
          DocumentRendererInterface.php
          HtmlDecorator.php
          HtmlRenderer.php
          MarkdownRendererInterface.php
          NodeRendererInterface.php
          NoMatchingRendererException.php
        Util/
          ArrayCollection.php
          Html5EntityDecoder.php
          HtmlElement.php
          HtmlFilter.php
          LinkParserHelper.php
          PrioritizedList.php
          RegexHelper.php
          SpecReader.php
          UrlEncoder.php
          Xml.php
        Xml/
          FallbackNodeXmlRenderer.php
          MarkdownToXmlConverter.php
          XmlNodeRendererInterface.php
          XmlRenderer.php
        CommonMarkConverter.php
        ConverterInterface.php
        GithubFlavoredMarkdownConverter.php
        MarkdownConverter.php
        MarkdownConverterInterface.php
      .phpstorm.meta.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
    config/
      src/
        Exception/
          ConfigurationExceptionInterface.php
          InvalidConfigurationException.php
          UnknownOptionException.php
          ValidationException.php
        Configuration.php
        ConfigurationAwareInterface.php
        ConfigurationBuilderInterface.php
        ConfigurationInterface.php
        ConfigurationProviderInterface.php
        MutableConfigurationInterface.php
        ReadOnlyConfiguration.php
        SchemaBuilderInterface.php
      CHANGELOG.md
      composer.json
      LICENSE.md
      README.md
    flysystem/
      src/
        UnixVisibility/
          PortableVisibilityConverter.php
          VisibilityConverter.php
        UrlGeneration/
          ChainedPublicUrlGenerator.php
          PrefixPublicUrlGenerator.php
          PublicUrlGenerator.php
          ShardedPrefixPublicUrlGenerator.php
          TemporaryUrlGenerator.php
        CalculateChecksumFromStream.php
        ChecksumAlgoIsNotSupported.php
        ChecksumProvider.php
        Config.php
        CorruptedPathDetected.php
        DecoratedAdapter.php
        DirectoryAttributes.php
        DirectoryListing.php
        FileAttributes.php
        Filesystem.php
        FilesystemAdapter.php
        FilesystemException.php
        FilesystemOperationFailed.php
        FilesystemOperator.php
        FilesystemReader.php
        FilesystemWriter.php
        InvalidStreamProvided.php
        InvalidVisibilityProvided.php
        MountManager.php
        PathNormalizer.php
        PathPrefixer.php
        PathTraversalDetected.php
        PortableVisibilityGuard.php
        ProxyArrayAccessToProperties.php
        ResolveIdenticalPathConflict.php
        StorageAttributes.php
        SymbolicLinkEncountered.php
        UnableToCheckDirectoryExistence.php
        UnableToCheckExistence.php
        UnableToCheckFileExistence.php
        UnableToCopyFile.php
        UnableToCreateDirectory.php
        UnableToDeleteDirectory.php
        UnableToDeleteFile.php
        UnableToGeneratePublicUrl.php
        UnableToGenerateTemporaryUrl.php
        UnableToListContents.php
        UnableToMountFilesystem.php
        UnableToMoveFile.php
        UnableToProvideChecksum.php
        UnableToReadFile.php
        UnableToResolveFilesystemMount.php
        UnableToRetrieveMetadata.php
        UnableToSetVisibility.php
        UnableToWriteFile.php
        UnreadableFileEncountered.php
        Visibility.php
        WhitespacePathNormalizer.php
      composer.json
      INFO.md
      LICENSE
      readme.md
    flysystem-local/
      composer.json
      FallbackMimeTypeDetector.php
      LICENSE
      LocalFilesystemAdapter.php
    mime-type-detection/
      src/
        EmptyExtensionToMimeTypeMap.php
        ExtensionLookup.php
        ExtensionMimeTypeDetector.php
        ExtensionToMimeTypeMap.php
        FinfoMimeTypeDetector.php
        GeneratedExtensionToMimeTypeMap.php
        MimeTypeDetector.php
        OverridingExtensionToMimeTypeMap.php
      CHANGELOG.md
      composer.json
      LICENSE
    uri/
      UriTemplate/
        Expression.php
        Operator.php
        Template.php
        TemplateCanNotBeExpanded.php
        VariableBag.php
        VarSpecifier.php
      BaseUri.php
      composer.json
      Http.php
      HttpFactory.php
      LICENSE
      Uri.php
      UriInfo.php
      UriResolver.php
      UriTemplate.php
    uri-interfaces/
      Contracts/
        AuthorityInterface.php
        DataPathInterface.php
        DomainHostInterface.php
        FragmentInterface.php
        HostInterface.php
        IpHostInterface.php
        PathInterface.php
        PortInterface.php
        QueryInterface.php
        SegmentedPathInterface.php
        UriAccess.php
        UriComponentInterface.php
        UriException.php
        UriInterface.php
        UserInfoInterface.php
      Exceptions/
        ConversionFailed.php
        MissingFeature.php
        OffsetOutOfBounds.php
        SyntaxError.php
      Idna/
        Converter.php
        Error.php
        Option.php
        Result.php
      IPv4/
        BCMathCalculator.php
        Calculator.php
        Converter.php
        GMPCalculator.php
        NativeCalculator.php
      IPv6/
        Converter.php
      KeyValuePair/
        Converter.php
      composer.json
      Encoder.php
      FeatureDetection.php
      LICENSE
      QueryString.php
      UriString.php
  mockery/
    mockery/
      docs/
        _static/
          .gitkeep
        cookbook/
          big_parent_class.rst
          class_constants.rst
          default_expectations.rst
          detecting_mock_objects.rst
          index.rst
          map.rst.inc
          mockery_on.rst
          mocking_class_within_class.rst
          mocking_hard_dependencies.rst
          not_calling_the_constructor.rst
        getting_started/
          index.rst
          installation.rst
          map.rst.inc
          quick_reference.rst
          simple_example.rst
          upgrading.rst
        mockery/
          configuration.rst
          exceptions.rst
          gotchas.rst
          index.rst
          map.rst.inc
          reserved_method_names.rst
        reference/
          alternative_should_receive_syntax.rst
          argument_validation.rst
          creating_test_doubles.rst
          demeter_chains.rst
          expectations.rst
          final_methods_classes.rst
          index.rst
          instance_mocking.rst
          magic_methods.rst
          map.rst.inc
          partial_mocks.rst
          pass_by_reference_behaviours.rst
          phpunit_integration.rst
          protected_methods.rst
          public_properties.rst
          public_static_properties.rst
          spies.rst
        .gitignore
        conf.py
        index.rst
        Makefile
        README.md
        requirements.txt
      library/
        Mockery/
          Adapter/
            Phpunit/
              MockeryPHPUnitIntegration.php
              MockeryPHPUnitIntegrationAssertPostConditions.php
              MockeryTestCase.php
              MockeryTestCaseSetUp.php
              TestListener.php
              TestListenerTrait.php
          CountValidator/
            AtLeast.php
            AtMost.php
            CountValidatorAbstract.php
            CountValidatorInterface.php
            Exact.php
            Exception.php
          Exception/
            BadMethodCallException.php
            InvalidArgumentException.php
            InvalidCountException.php
            InvalidOrderException.php
            MockeryExceptionInterface.php
            NoMatchingExpectationException.php
            RuntimeException.php
          Generator/
            StringManipulation/
              Pass/
                AvoidMethodClashPass.php
                CallTypeHintPass.php
                ClassAttributesPass.php
                ClassNamePass.php
                ClassPass.php
                ConstantsPass.php
                InstanceMockPass.php
                InterfacePass.php
                MagicMethodTypeHintsPass.php
                MethodDefinitionPass.php
                Pass.php
                RemoveBuiltinMethodsThatAreFinalPass.php
                RemoveDestructorPass.php
                RemoveUnserializeForInternalSerializableClassesPass.php
                TraitPass.php
            CachingGenerator.php
            DefinedTargetClass.php
            Generator.php
            Method.php
            MockConfiguration.php
            MockConfigurationBuilder.php
            MockDefinition.php
            MockNameBuilder.php
            Parameter.php
            StringManipulationGenerator.php
            TargetClassInterface.php
            UndefinedTargetClass.php
          Loader/
            EvalLoader.php
            Loader.php
            RequireLoader.php
          Matcher/
            AndAnyOtherArgs.php
            Any.php
            AnyArgs.php
            AnyOf.php
            ArgumentListMatcher.php
            Closure.php
            Contains.php
            Ducktype.php
            HasKey.php
            HasValue.php
            IsEqual.php
            IsSame.php
            MatcherAbstract.php
            MatcherInterface.php
            MultiArgumentClosure.php
            MustBe.php
            NoArgs.php
            Not.php
            NotAnyOf.php
            Pattern.php
            Subset.php
            Type.php
          ClosureWrapper.php
          CompositeExpectation.php
          Configuration.php
          Container.php
          Exception.php
          Expectation.php
          ExpectationDirector.php
          ExpectationInterface.php
          ExpectsHigherOrderMessage.php
          HigherOrderMessage.php
          Instantiator.php
          LegacyMockInterface.php
          MethodCall.php
          Mock.php
          MockInterface.php
          QuickDefinitionsConfiguration.php
          ReceivedMethodCalls.php
          Reflector.php
          Undefined.php
          VerificationDirector.php
          VerificationExpectation.php
        helpers.php
        Mockery.php
      .phpstorm.meta.php
      .readthedocs.yml
      CHANGELOG.md
      composer.json
      composer.lock
      CONTRIBUTING.md
      COPYRIGHT.md
      LICENSE
      README.md
      SECURITY.md
  monolog/
    monolog/
      src/
        Monolog/
          Attribute/
            AsMonologProcessor.php
            WithMonologChannel.php
          Formatter/
            ChromePHPFormatter.php
            ElasticaFormatter.php
            ElasticsearchFormatter.php
            FlowdockFormatter.php
            FluentdFormatter.php
            FormatterInterface.php
            GelfMessageFormatter.php
            GoogleCloudLoggingFormatter.php
            HtmlFormatter.php
            JsonFormatter.php
            LineFormatter.php
            LogglyFormatter.php
            LogmaticFormatter.php
            LogstashFormatter.php
            MongoDBFormatter.php
            NormalizerFormatter.php
            ScalarFormatter.php
            SyslogFormatter.php
            WildfireFormatter.php
          Handler/
            Curl/
              Util.php
            FingersCrossed/
              ActivationStrategyInterface.php
              ChannelLevelActivationStrategy.php
              ErrorLevelActivationStrategy.php
            Slack/
              SlackRecord.php
            SyslogUdp/
              UdpSocket.php
            AbstractHandler.php
            AbstractProcessingHandler.php
            AbstractSyslogHandler.php
            AmqpHandler.php
            BrowserConsoleHandler.php
            BufferHandler.php
            ChromePHPHandler.php
            CouchDBHandler.php
            CubeHandler.php
            DeduplicationHandler.php
            DoctrineCouchDBHandler.php
            DynamoDbHandler.php
            ElasticaHandler.php
            ElasticsearchHandler.php
            ErrorLogHandler.php
            FallbackGroupHandler.php
            FilterHandler.php
            FingersCrossedHandler.php
            FirePHPHandler.php
            FleepHookHandler.php
            FlowdockHandler.php
            FormattableHandlerInterface.php
            FormattableHandlerTrait.php
            GelfHandler.php
            GroupHandler.php
            Handler.php
            HandlerInterface.php
            HandlerWrapper.php
            IFTTTHandler.php
            InsightOpsHandler.php
            LogEntriesHandler.php
            LogglyHandler.php
            LogmaticHandler.php
            MailHandler.php
            MandrillHandler.php
            MissingExtensionException.php
            MongoDBHandler.php
            NativeMailerHandler.php
            NewRelicHandler.php
            NoopHandler.php
            NullHandler.php
            OverflowHandler.php
            PHPConsoleHandler.php
            ProcessableHandlerInterface.php
            ProcessableHandlerTrait.php
            ProcessHandler.php
            PsrHandler.php
            PushoverHandler.php
            RedisHandler.php
            RedisPubSubHandler.php
            RollbarHandler.php
            RotatingFileHandler.php
            SamplingHandler.php
            SendGridHandler.php
            SlackHandler.php
            SlackWebhookHandler.php
            SocketHandler.php
            SqsHandler.php
            StreamHandler.php
            SymfonyMailerHandler.php
            SyslogHandler.php
            SyslogUdpHandler.php
            TelegramBotHandler.php
            TestHandler.php
            WebRequestRecognizerTrait.php
            WhatFailureGroupHandler.php
            ZendMonitorHandler.php
          Processor/
            ClosureContextProcessor.php
            GitProcessor.php
            HostnameProcessor.php
            IntrospectionProcessor.php
            LoadAverageProcessor.php
            MemoryPeakUsageProcessor.php
            MemoryProcessor.php
            MemoryUsageProcessor.php
            MercurialProcessor.php
            ProcessIdProcessor.php
            ProcessorInterface.php
            PsrLogMessageProcessor.php
            TagProcessor.php
            UidProcessor.php
            WebProcessor.php
          Test/
            MonologTestCase.php
            TestCase.php
          DateTimeImmutable.php
          ErrorHandler.php
          JsonSerializableDateTimeImmutable.php
          Level.php
          Logger.php
          LogRecord.php
          Registry.php
          ResettableInterface.php
          SignalHandler.php
          Utils.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
  myclabs/
    deep-copy/
      src/
        DeepCopy/
          Exception/
            CloneException.php
            PropertyException.php
          Filter/
            Doctrine/
              DoctrineCollectionFilter.php
              DoctrineEmptyCollectionFilter.php
              DoctrineProxyFilter.php
            ChainableFilter.php
            Filter.php
            KeepFilter.php
            ReplaceFilter.php
            SetNullFilter.php
          Matcher/
            Doctrine/
              DoctrineProxyMatcher.php
            Matcher.php
            PropertyMatcher.php
            PropertyNameMatcher.php
            PropertyTypeMatcher.php
          Reflection/
            ReflectionHelper.php
          TypeFilter/
            Date/
              DateIntervalFilter.php
              DatePeriodFilter.php
            Spl/
              ArrayObjectFilter.php
              SplDoublyLinkedList.php
              SplDoublyLinkedListFilter.php
            ReplaceFilter.php
            ShallowCopyFilter.php
            TypeFilter.php
          TypeMatcher/
            TypeMatcher.php
          deep_copy.php
          DeepCopy.php
      composer.json
      LICENSE
      README.md
  nesbot/
    carbon/
      bin/
        carbon
        carbon.bat
      lazy/
        Carbon/
          MessageFormatter/
            MessageFormatterMapperStrongType.php
            MessageFormatterMapperWeakType.php
          ProtectedDatePeriod.php
          TranslatorStrongType.php
          TranslatorWeakType.php
          UnprotectedDatePeriod.php
      src/
        Carbon/
          Cli/
            Invoker.php
          Exceptions/
            BadComparisonUnitException.php
            BadFluentConstructorException.php
            BadFluentSetterException.php
            BadMethodCallException.php
            EndLessPeriodException.php
            Exception.php
            ImmutableException.php
            InvalidArgumentException.php
            InvalidCastException.php
            InvalidDateException.php
            InvalidFormatException.php
            InvalidIntervalException.php
            InvalidPeriodDateException.php
            InvalidPeriodParameterException.php
            InvalidTimeZoneException.php
            InvalidTypeException.php
            NotACarbonClassException.php
            NotAPeriodException.php
            NotLocaleAwareException.php
            OutOfRangeException.php
            ParseErrorException.php
            RuntimeException.php
            UnitException.php
            UnitNotConfiguredException.php
            UnknownGetterException.php
            UnknownMethodException.php
            UnknownSetterException.php
            UnknownUnitException.php
            UnreachableException.php
            UnsupportedUnitException.php
          Lang/
            aa_DJ.php
            aa_ER.php
            aa_ER@saaho.php
            aa_ET.php
            aa.php
            af_NA.php
            af_ZA.php
            af.php
            agq.php
            agr_PE.php
            agr.php
            ak_GH.php
            ak.php
            am_ET.php
            am.php
            an_ES.php
            an.php
            anp_IN.php
            anp.php
            ar_AE.php
            ar_BH.php
            ar_DJ.php
            ar_DZ.php
            ar_EG.php
            ar_EH.php
            ar_ER.php
            ar_IL.php
            ar_IN.php
            ar_IQ.php
            ar_JO.php
            ar_KM.php
            ar_KW.php
            ar_LB.php
            ar_LY.php
            ar_MA.php
            ar_MR.php
            ar_OM.php
            ar_PS.php
            ar_QA.php
            ar_SA.php
            ar_SD.php
            ar_Shakl.php
            ar_SO.php
            ar_SS.php
            ar_SY.php
            ar_TD.php
            ar_TN.php
            ar_YE.php
            ar.php
            as_IN.php
            as.php
            asa.php
            ast_ES.php
            ast.php
            ayc_PE.php
            ayc.php
            az_AZ.php
            az_Cyrl.php
            az_IR.php
            az_Latn.php
            az.php
            bas.php
            be_BY.php
            be_BY@latin.php
            be.php
            bem_ZM.php
            bem.php
            ber_DZ.php
            ber_MA.php
            ber.php
            bez.php
            bg_BG.php
            bg.php
            bhb_IN.php
            bhb.php
            bho_IN.php
            bho.php
            bi_VU.php
            bi.php
            bm.php
            bn_BD.php
            bn_IN.php
            bn.php
            bo_CN.php
            bo_IN.php
            bo.php
            br_FR.php
            br.php
            brx_IN.php
            brx.php
            bs_BA.php
            bs_Cyrl.php
            bs_Latn.php
            bs.php
            byn_ER.php
            byn.php
            ca_AD.php
            ca_ES_Valencia.php
            ca_ES.php
            ca_FR.php
            ca_IT.php
            ca.php
            ccp_IN.php
            ccp.php
            ce_RU.php
            ce.php
            cgg.php
            chr_US.php
            chr.php
            ckb.php
            cmn_TW.php
            cmn.php
            crh_UA.php
            crh.php
            cs_CZ.php
            cs.php
            csb_PL.php
            csb.php
            cu.php
            cv_RU.php
            cv.php
            cy_GB.php
            cy.php
            da_DK.php
            da_GL.php
            da.php
            dav.php
            de_AT.php
            de_BE.php
            de_CH.php
            de_DE.php
            de_IT.php
            de_LI.php
            de_LU.php
            de.php
            dje.php
            doi_IN.php
            doi.php
            dsb_DE.php
            dsb.php
            dua.php
            dv_MV.php
            dv.php
            dyo.php
            dz_BT.php
            dz.php
            ebu.php
            ee_TG.php
            ee.php
            el_CY.php
            el_GR.php
            el.php
            en_001.php
            en_150.php
            en_AG.php
            en_AI.php
            en_AS.php
            en_AT.php
            en_AU.php
            en_BB.php
            en_BE.php
            en_BI.php
            en_BM.php
            en_BS.php
            en_BW.php
            en_BZ.php
            en_CA.php
            en_CC.php
            en_CH.php
            en_CK.php
            en_CM.php
            en_CX.php
            en_CY.php
            en_DE.php
            en_DG.php
            en_DK.php
            en_DM.php
            en_ER.php
            en_FI.php
            en_FJ.php
            en_FK.php
            en_FM.php
            en_GB.php
            en_GD.php
            en_GG.php
            en_GH.php
            en_GI.php
            en_GM.php
            en_GU.php
            en_GY.php
            en_HK.php
            en_IE.php
            en_IL.php
            en_IM.php
            en_IN.php
            en_IO.php
            en_ISO.php
            en_JE.php
            en_JM.php
            en_KE.php
            en_KI.php
            en_KN.php
            en_KY.php
            en_LC.php
            en_LR.php
            en_LS.php
            en_MG.php
            en_MH.php
            en_MO.php
            en_MP.php
            en_MS.php
            en_MT.php
            en_MU.php
            en_MW.php
            en_MY.php
            en_NA.php
            en_NF.php
            en_NG.php
            en_NL.php
            en_NR.php
            en_NU.php
            en_NZ.php
            en_PG.php
            en_PH.php
            en_PK.php
            en_PN.php
            en_PR.php
            en_PW.php
            en_RW.php
            en_SB.php
            en_SC.php
            en_SD.php
            en_SE.php
            en_SG.php
            en_SH.php
            en_SI.php
            en_SL.php
            en_SS.php
            en_SX.php
            en_SZ.php
            en_TC.php
            en_TK.php
            en_TO.php
            en_TT.php
            en_TV.php
            en_TZ.php
            en_UG.php
            en_UM.php
            en_US_Posix.php
            en_US.php
            en_VC.php
            en_VG.php
            en_VI.php
            en_VU.php
            en_WS.php
            en_ZA.php
            en_ZM.php
            en_ZW.php
            en.php
            eo.php
            es_419.php
            es_AR.php
            es_BO.php
            es_BR.php
            es_BZ.php
            es_CL.php
            es_CO.php
            es_CR.php
            es_CU.php
            es_DO.php
            es_EA.php
            es_EC.php
            es_ES.php
            es_GQ.php
            es_GT.php
            es_HN.php
            es_IC.php
            es_MX.php
            es_NI.php
            es_PA.php
            es_PE.php
            es_PH.php
            es_PR.php
            es_PY.php
            es_SV.php
            es_US.php
            es_UY.php
            es_VE.php
            es.php
            et_EE.php
            et.php
            eu_ES.php
            eu.php
            ewo.php
            fa_AF.php
            fa_IR.php
            fa.php
            ff_CM.php
            ff_GN.php
            ff_MR.php
            ff_SN.php
            ff.php
            fi_FI.php
            fi.php
            fil_PH.php
            fil.php
            fo_DK.php
            fo_FO.php
            fo.php
            fr_BE.php
            fr_BF.php
            fr_BI.php
            fr_BJ.php
            fr_BL.php
            fr_CA.php
            fr_CD.php
            fr_CF.php
            fr_CG.php
            fr_CH.php
            fr_CI.php
            fr_CM.php
            fr_DJ.php
            fr_DZ.php
            fr_FR.php
            fr_GA.php
            fr_GF.php
            fr_GN.php
            fr_GP.php
            fr_GQ.php
            fr_HT.php
            fr_KM.php
            fr_LU.php
            fr_MA.php
            fr_MC.php
            fr_MF.php
            fr_MG.php
            fr_ML.php
            fr_MQ.php
            fr_MR.php
            fr_MU.php
            fr_NC.php
            fr_NE.php
            fr_PF.php
            fr_PM.php
            fr_RE.php
            fr_RW.php
            fr_SC.php
            fr_SN.php
            fr_SY.php
            fr_TD.php
            fr_TG.php
            fr_TN.php
            fr_VU.php
            fr_WF.php
            fr_YT.php
            fr.php
            fur_IT.php
            fur.php
            fy_DE.php
            fy_NL.php
            fy.php
            ga_IE.php
            ga.php
            gd_GB.php
            gd.php
            gez_ER.php
            gez_ET.php
            gez.php
            gl_ES.php
            gl.php
            gom_Latn.php
            gom.php
            gsw_CH.php
            gsw_FR.php
            gsw_LI.php
            gsw.php
            gu_IN.php
            gu.php
            guz.php
            gv_GB.php
            gv.php
            ha_GH.php
            ha_NE.php
            ha_NG.php
            ha.php
            hak_TW.php
            hak.php
            haw.php
            he_IL.php
            he.php
            hi_IN.php
            hi.php
            hif_FJ.php
            hif.php
            hne_IN.php
            hne.php
            hr_BA.php
            hr_HR.php
            hr.php
            hsb_DE.php
            hsb.php
            ht_HT.php
            ht.php
            hu_HU.php
            hu.php
            hy_AM.php
            hy.php
            i18n.php
            ia_FR.php
            ia.php
            id_ID.php
            id.php
            ig_NG.php
            ig.php
            ii.php
            ik_CA.php
            ik.php
            in.php
            is_IS.php
            is.php
            it_CH.php
            it_IT.php
            it_SM.php
            it_VA.php
            it.php
            iu_CA.php
            iu.php
            iw.php
            ja_JP.php
            ja.php
            jgo.php
            jmc.php
            jv.php
            ka_GE.php
            ka.php
            kab_DZ.php
            kab.php
            kam.php
            kde.php
            kea.php
            khq.php
            ki.php
            kk_KZ.php
            kk.php
            kkj.php
            kl_GL.php
            kl.php
            kln.php
            km_KH.php
            km.php
            kn_IN.php
            kn.php
            ko_KP.php
            ko_KR.php
            ko.php
            kok_IN.php
            kok.php
            ks_IN.php
            ks_IN@devanagari.php
            ks.php
            ksb.php
            ksf.php
            ksh.php
            ku_TR.php
            ku.php
            kw_GB.php
            kw.php
            ky_KG.php
            ky.php
            lag.php
            lb_LU.php
            lb.php
            lg_UG.php
            lg.php
            li_NL.php
            li.php
            lij_IT.php
            lij.php
            lkt.php
            ln_AO.php
            ln_CD.php
            ln_CF.php
            ln_CG.php
            ln.php
            lo_LA.php
            lo.php
            lrc_IQ.php
            lrc.php
            lt_LT.php
            lt.php
            lu.php
            luo.php
            luy.php
            lv_LV.php
            lv.php
            lzh_TW.php
            lzh.php
            mag_IN.php
            mag.php
            mai_IN.php
            mai.php
            mas_TZ.php
            mas.php
            mer.php
            mfe_MU.php
            mfe.php
            mg_MG.php
            mg.php
            mgh.php
            mgo.php
            mhr_RU.php
            mhr.php
            mi_NZ.php
            mi.php
            miq_NI.php
            miq.php
            mjw_IN.php
            mjw.php
            mk_MK.php
            mk.php
            ml_IN.php
            ml.php
            mn_MN.php
            mn.php
            mni_IN.php
            mni.php
            mo.php
            mr_IN.php
            mr.php
            ms_BN.php
            ms_MY.php
            ms_SG.php
            ms.php
            mt_MT.php
            mt.php
            mua.php
            my_MM.php
            my.php
            mzn.php
            nan_TW.php
            nan_TW@latin.php
            nan.php
            naq.php
            nb_NO.php
            nb_SJ.php
            nb.php
            nd.php
            nds_DE.php
            nds_NL.php
            nds.php
            ne_IN.php
            ne_NP.php
            ne.php
            nhn_MX.php
            nhn.php
            niu_NU.php
            niu.php
            nl_AW.php
            nl_BE.php
            nl_BQ.php
            nl_CW.php
            nl_NL.php
            nl_SR.php
            nl_SX.php
            nl.php
            nmg.php
            nn_NO.php
            nn.php
            nnh.php
            no.php
            nr_ZA.php
            nr.php
            nso_ZA.php
            nso.php
            nus.php
            nyn.php
            oc_FR.php
            oc.php
            om_ET.php
            om_KE.php
            om.php
            or_IN.php
            or.php
            os_RU.php
            os.php
            pa_Arab.php
            pa_Guru.php
            pa_IN.php
            pa_PK.php
            pa.php
            pap_AW.php
            pap_CW.php
            pap.php
            pl_PL.php
            pl.php
            prg.php
            ps_AF.php
            ps.php
            pt_AO.php
            pt_BR.php
            pt_CH.php
            pt_CV.php
            pt_GQ.php
            pt_GW.php
            pt_LU.php
            pt_MO.php
            pt_MZ.php
            pt_PT.php
            pt_ST.php
            pt_TL.php
            pt.php
            qu_BO.php
            qu_EC.php
            qu.php
            quz_PE.php
            quz.php
            raj_IN.php
            raj.php
            rm.php
            rn.php
            ro_MD.php
            ro_RO.php
            ro.php
            rof.php
            ru_BY.php
            ru_KG.php
            ru_KZ.php
            ru_MD.php
            ru_RU.php
            ru_UA.php
            ru.php
            rw_RW.php
            rw.php
            rwk.php
            sa_IN.php
            sa.php
            sah_RU.php
            sah.php
            saq.php
            sat_IN.php
            sat.php
            sbp.php
            sc_IT.php
            sc.php
            sd_IN.php
            sd_IN@devanagari.php
            sd.php
            se_FI.php
            se_NO.php
            se_SE.php
            se.php
            seh.php
            ses.php
            sg.php
            sgs_LT.php
            sgs.php
            sh.php
            shi_Latn.php
            shi_Tfng.php
            shi.php
            shn_MM.php
            shn.php
            shs_CA.php
            shs.php
            si_LK.php
            si.php
            sid_ET.php
            sid.php
            sk_SK.php
            sk.php
            sl_SI.php
            sl.php
            sm_WS.php
            sm.php
            smn.php
            sn.php
            so_DJ.php
            so_ET.php
            so_KE.php
            so_SO.php
            so.php
            sq_AL.php
            sq_MK.php
            sq_XK.php
            sq.php
            sr_Cyrl_BA.php
            sr_Cyrl_ME.php
            sr_Cyrl_XK.php
            sr_Cyrl.php
            sr_Latn_BA.php
            sr_Latn_ME.php
            sr_Latn_XK.php
            sr_Latn.php
            sr_ME.php
            sr_RS.php
            sr_RS@latin.php
            sr.php
            ss_ZA.php
            ss.php
            st_ZA.php
            st.php
            sv_AX.php
            sv_FI.php
            sv_SE.php
            sv.php
            sw_CD.php
            sw_KE.php
            sw_TZ.php
            sw_UG.php
            sw.php
            szl_PL.php
            szl.php
            ta_IN.php
            ta_LK.php
            ta_MY.php
            ta_SG.php
            ta.php
            tcy_IN.php
            tcy.php
            te_IN.php
            te.php
            teo_KE.php
            teo.php
            tet.php
            tg_TJ.php
            tg.php
            th_TH.php
            th.php
            the_NP.php
            the.php
            ti_ER.php
            ti_ET.php
            ti.php
            tig_ER.php
            tig.php
            tk_TM.php
            tk.php
            tl_PH.php
            tl.php
            tlh.php
            tn_ZA.php
            tn.php
            to_TO.php
            to.php
            tpi_PG.php
            tpi.php
            tr_CY.php
            tr_TR.php
            tr.php
            ts_ZA.php
            ts.php
            tt_RU.php
            tt_RU@iqtelif.php
            tt.php
            twq.php
            tzl.php
            tzm_Latn.php
            tzm.php
            ug_CN.php
            ug.php
            uk_UA.php
            uk.php
            unm_US.php
            unm.php
            ur_IN.php
            ur_PK.php
            ur.php
            uz_Arab.php
            uz_Cyrl.php
            uz_Latn.php
            uz_UZ.php
            uz_UZ@cyrillic.php
            uz.php
            vai_Latn.php
            vai_Vaii.php
            vai.php
            ve_ZA.php
            ve.php
            vi_VN.php
            vi.php
            vo.php
            vun.php
            wa_BE.php
            wa.php
            wae_CH.php
            wae.php
            wal_ET.php
            wal.php
            wo_SN.php
            wo.php
            xh_ZA.php
            xh.php
            xog.php
            yav.php
            yi_US.php
            yi.php
            yo_BJ.php
            yo_NG.php
            yo.php
            yue_Hans.php
            yue_Hant.php
            yue_HK.php
            yue.php
            yuw_PG.php
            yuw.php
            zgh.php
            zh_CN.php
            zh_Hans_HK.php
            zh_Hans_MO.php
            zh_Hans_SG.php
            zh_Hans.php
            zh_Hant_HK.php
            zh_Hant_MO.php
            zh_Hant_TW.php
            zh_Hant.php
            zh_HK.php
            zh_MO.php
            zh_SG.php
            zh_TW.php
            zh_YUE.php
            zh.php
            zu_ZA.php
            zu.php
          Laravel/
            ServiceProvider.php
          List/
            languages.php
            regions.php
          MessageFormatter/
            MessageFormatterMapper.php
          PHPStan/
            MacroExtension.php
            MacroMethodReflection.php
          Traits/
            Boundaries.php
            Cast.php
            Comparison.php
            Converter.php
            Creator.php
            Date.php
            DeprecatedPeriodProperties.php
            Difference.php
            IntervalRounding.php
            IntervalStep.php
            LocalFactory.php
            Localization.php
            Macro.php
            MagicParameter.php
            Mixin.php
            Modifiers.php
            Mutability.php
            ObjectInitialisation.php
            Options.php
            Rounding.php
            Serialization.php
            StaticLocalization.php
            StaticOptions.php
            Test.php
            Timestamp.php
            ToStringFormat.php
            Units.php
            Week.php
          AbstractTranslator.php
          Callback.php
          Carbon.php
          CarbonConverterInterface.php
          CarbonImmutable.php
          CarbonInterface.php
          CarbonInterval.php
          CarbonPeriod.php
          CarbonPeriodImmutable.php
          CarbonTimeZone.php
          Factory.php
          FactoryImmutable.php
          Language.php
          Month.php
          Translator.php
          TranslatorImmutable.php
          TranslatorStrongTypeInterface.php
          Unit.php
          WeekDay.php
          WrapperClock.php
      .phpstorm.meta.php
      composer.json
      extension.neon
      LICENSE
      readme.md
      sponsors.php
  nette/
    schema/
      src/
        Schema/
          Elements/
            AnyOf.php
            Base.php
            Structure.php
            Type.php
          Context.php
          DynamicParameter.php
          Expect.php
          Helpers.php
          Message.php
          Processor.php
          Schema.php
          ValidationException.php
      composer.json
      license.md
      readme.md
    utils/
      src/
        Iterators/
          CachingIterator.php
          Mapper.php
        Utils/
          ArrayHash.php
          ArrayList.php
          Arrays.php
          Callback.php
          DateTime.php
          exceptions.php
          FileInfo.php
          FileSystem.php
          Finder.php
          Floats.php
          Helpers.php
          Html.php
          Image.php
          ImageColor.php
          ImageType.php
          Iterables.php
          Json.php
          ObjectHelpers.php
          Paginator.php
          Random.php
          Reflection.php
          ReflectionMethod.php
          Strings.php
          Type.php
          Validators.php
        compatibility.php
        exceptions.php
        HtmlStringable.php
        SmartObject.php
        StaticClass.php
        Translator.php
      .phpstorm.meta.php
      composer.json
      license.md
      readme.md
  nikic/
    php-parser/
      bin/
        php-parse
      lib/
        PhpParser/
          Builder/
            Class_.php
            ClassConst.php
            Declaration.php
            Enum_.php
            EnumCase.php
            Function_.php
            FunctionLike.php
            Interface_.php
            Method.php
            Namespace_.php
            Param.php
            Property.php
            Trait_.php
            TraitUse.php
            TraitUseAdaptation.php
          User.php
          Watershed.php
        ```

        ---

        ## Documentation Addendum (Sept 2025 Single-Tenant Refactor)

        This project migrated from a multi-association pivot (`user_tenants`) to a strict single-tenant user model:

        | Legacy | Current |
        |--------|---------|
        | `users` ⇄ `user_tenants` ⇄ `tenants` | `users.tenant_id` (nullable FK) |
        | Role determined via pivot context | `users.role_id` (single role) |
        | Implicit change history | Explicit `user_tenant_changes` audit rows |

        Legacy `UserTenant` model has been fully removed; historical pivot logic retained here only for archival context.

        ### Role Scopes
        Roles classified as `system` or `tenant` scoped. Invariants:
        * Tenant-scoped role → `tenant_id` required.
        * System-scoped role → `tenant_id` must be null.

        ### Integrity Verification
        Artisan command:
        ```
        php artisan tenancy:verify        # Summary
        php artisan tenancy:verify --json # JSON detail
        ```
        Fails (exit code 1) on:
        1. Tenant role without tenant
        2. System role with tenant
        3. User missing role
        4. Audit row with orphan new_role_id

        ### Audit Table
        `user_tenant_changes` keeps (user_id, old/new role & tenant, changed_by_user_id, created_at). Used for traceability and integrity checks.

        ### Testing Notes
        SQLite tests rely on stub lake / layer migrations guarded from Postgres-specific spatial DDL.

        ---
        ```
          ErrorHandler/
            Collecting.php
            Throwing.php
          Internal/
            DiffElem.php
            Differ.php
            PrintableNewAnonClassNode.php
            TokenPolyfill.php
            TokenStream.php
          Lexer/
            TokenEmulator/
              AsymmetricVisibilityTokenEmulator.php
              AttributeEmulator.php
              EnumTokenEmulator.php
              ExplicitOctalEmulator.php
              KeywordEmulator.php
              MatchTokenEmulator.php
              NullsafeTokenEmulator.php
              PipeOperatorEmulator.php
              PropertyTokenEmulator.php
              ReadonlyFunctionTokenEmulator.php
              ReadonlyTokenEmulator.php
              ReverseEmulator.php
              TokenEmulator.php
              VoidCastEmulator.php
            Emulative.php
          Node/
            Expr/
              AssignOp/
                BitwiseAnd.php
                BitwiseOr.php
                BitwiseXor.php
                Coalesce.php
                Concat.php
                Div.php
                Minus.php
                Mod.php
                Mul.php
                Plus.php
                Pow.php
                ShiftLeft.php
                ShiftRight.php
              BinaryOp/
                BitwiseAnd.php
                BitwiseOr.php
                BitwiseXor.php
                BooleanAnd.php
                BooleanOr.php
                Coalesce.php
                Concat.php
                Div.php
                Equal.php
                Greater.php
                GreaterOrEqual.php
                Identical.php
                LogicalAnd.php
                LogicalOr.php
                LogicalXor.php
                Minus.php
                Mod.php
                Mul.php
                NotEqual.php
                NotIdentical.php
                Pipe.php
                Plus.php
                Pow.php
                ShiftLeft.php
                ShiftRight.php
                Smaller.php
                SmallerOrEqual.php
                Spaceship.php
              Cast/
                Array_.php
                Bool_.php
                Double.php
                Int_.php
                Object_.php
                String_.php
                Unset_.php
                Void_.php
              Array_.php
              ArrayDimFetch.php
              ArrayItem.php
              ArrowFunction.php
              Assign.php
              AssignOp.php
              AssignRef.php
              BinaryOp.php
              BitwiseNot.php
              BooleanNot.php
              CallLike.php
              Cast.php
              ClassConstFetch.php
              Clone_.php
              Closure.php
              ClosureUse.php
              ConstFetch.php
              Empty_.php
              Error.php
              ErrorSuppress.php
              Eval_.php
              Exit_.php
              FuncCall.php
              Include_.php
              Instanceof_.php
              Isset_.php
              List_.php
              Match_.php
              MethodCall.php
              New_.php
              NullsafeMethodCall.php
              NullsafePropertyFetch.php
              PostDec.php
              PostInc.php
              PreDec.php
              PreInc.php
              Print_.php
              PropertyFetch.php
              ShellExec.php
              StaticCall.php
              StaticPropertyFetch.php
              Ternary.php
              Throw_.php
              UnaryMinus.php
              UnaryPlus.php
              Variable.php
              Yield_.php
              YieldFrom.php
            Name/
              FullyQualified.php
              Relative.php
            Scalar/
              MagicConst/
                Class_.php
                Dir.php
                File.php
                Function_.php
                Line.php
                Method.php
                Namespace_.php
                Property.php
                Trait_.php
              DNumber.php
              Encapsed.php
              EncapsedStringPart.php
              Float_.php
              Int_.php
              InterpolatedString.php
              LNumber.php
              MagicConst.php
              String_.php
            Stmt/
              TraitUseAdaptation/
                Alias.php
                Precedence.php
              Block.php
              Break_.php
              Case_.php
              Catch_.php
              Class_.php
              ClassConst.php
              ClassLike.php
              ClassMethod.php
              Const_.php
              Continue_.php
              Declare_.php
              DeclareDeclare.php
              Do_.php
              Echo_.php
              Else_.php
              ElseIf_.php
              Enum_.php
              EnumCase.php
              Expression.php
              Finally_.php
              For_.php
              Foreach_.php
              Function_.php
              Global_.php
              Goto_.php
              GroupUse.php
              HaltCompiler.php
              If_.php
              InlineHTML.php
              Interface_.php
              Label.php
              Namespace_.php
              Nop.php
              Property.php
              PropertyProperty.php
              Return_.php
              Static_.php
              StaticVar.php
              Switch_.php
              Trait_.php
              TraitUse.php
              TraitUseAdaptation.php
              TryCatch.php
              Unset_.php
              Use_.php
              UseUse.php
              While_.php
            Arg.php
            ArrayItem.php
            Attribute.php
            AttributeGroup.php
            ClosureUse.php
            ComplexType.php
            Const_.php
            DeclareItem.php
            Expr.php
            FunctionLike.php
            Identifier.php
            InterpolatedStringPart.php
            IntersectionType.php
            MatchArm.php
            Name.php
            NullableType.php
            Param.php
            PropertyHook.php
            PropertyItem.php
            Scalar.php
            StaticVar.php
            Stmt.php
            UnionType.php
            UseItem.php
            VariadicPlaceholder.php
            VarLikeIdentifier.php
          NodeVisitor/
            CloningVisitor.php
            CommentAnnotatingVisitor.php
            FindingVisitor.php
            FirstFindingVisitor.php
            NameResolver.php
            NodeConnectingVisitor.php
            ParentConnectingVisitor.php
          Parser/
            Php7.php
            Php8.php
          PrettyPrinter/
            Standard.php
          Builder.php
          BuilderFactory.php
          BuilderHelpers.php
          Comment.php
          compatibility_tokens.php
          ConstExprEvaluationException.php
          ConstExprEvaluator.php
          Error.php
          ErrorHandler.php
          JsonDecoder.php
          Lexer.php
          Modifiers.php
          NameContext.php
          Node.php
          NodeAbstract.php
          NodeDumper.php
          NodeFinder.php
          NodeTraverser.php
          NodeTraverserInterface.php
          NodeVisitor.php
          NodeVisitorAbstract.php
          Parser.php
          ParserAbstract.php
          ParserFactory.php
          PhpVersion.php
          PrettyPrinter.php
          PrettyPrinterAbstract.php
          Token.php
      composer.json
      LICENSE
      README.md
  nunomaduro/
    collision/
      .temp/
        .gitkeep
      src/
        Adapters/
          Laravel/
            Commands/
              TestCommand.php
            Exceptions/
              NotSupportedYetException.php
              RequirementsException.php
            CollisionServiceProvider.php
            ExceptionHandler.php
            IgnitionSolutionsRepository.php
            Inspector.php
          Phpunit/
            Printers/
              DefaultPrinter.php
              ReportablePrinter.php
            Subscribers/
              EnsurePrinterIsRegisteredSubscriber.php
              Subscriber.php
            Support/
              ResultReflection.php
            Autoload.php
            ConfigureIO.php
            State.php
            Style.php
            TestResult.php
        Contracts/
          Adapters/
            Phpunit/
              HasPrintableTestCaseName.php
          RenderableOnCollisionEditor.php
          RenderlessEditor.php
          RenderlessTrace.php
          SolutionsRepository.php
        Exceptions/
          InvalidStyleException.php
          ShouldNotHappen.php
          TestException.php
          TestOutcome.php
        SolutionsRepositories/
          NullSolutionsRepository.php
        ArgumentFormatter.php
        ConsoleColor.php
        Coverage.php
        Handler.php
        Highlighter.php
        Provider.php
        Writer.php
      composer.json
      LICENSE.md
      phpstan-baseline.neon
      README.md
    termwind/
      src/
        Actions/
          StyleToMethod.php
        Components/
          Anchor.php
          BreakLine.php
          Dd.php
          Div.php
          Dl.php
          Dt.php
          Element.php
          Hr.php
          Li.php
          Ol.php
          Paragraph.php
          Raw.php
          Span.php
          Ul.php
        Enums/
          Color.php
        Exceptions/
          ColorNotFound.php
          InvalidChild.php
          InvalidColor.php
          InvalidStyle.php
          StyleNotFound.php
        Helpers/
          QuestionHelper.php
        Html/
          CodeRenderer.php
          InheritStyles.php
          PreRenderer.php
          TableRenderer.php
        Laravel/
          TermwindServiceProvider.php
        Repositories/
          Styles.php
        ValueObjects/
          Node.php
          Style.php
          Styles.php
        Functions.php
        HtmlRenderer.php
        Question.php
        Terminal.php
        Termwind.php
      composer.json
      LICENSE.md
      playground.php
  phar-io/
    manifest/
      .github/
        workflows/
          ci.yml
        FUNDING.yml
      src/
        exceptions/
          ElementCollectionException.php
          Exception.php
          InvalidApplicationNameException.php
          InvalidEmailException.php
          InvalidUrlException.php
          ManifestDocumentException.php
          ManifestDocumentLoadingException.php
          ManifestDocumentMapperException.php
          ManifestElementException.php
          ManifestLoaderException.php
          NoEmailAddressException.php
        values/
          Application.php
          ApplicationName.php
          Author.php
          AuthorCollection.php
          AuthorCollectionIterator.php
          BundledComponent.php
          BundledComponentCollection.php
          BundledComponentCollectionIterator.php
          CopyrightInformation.php
          Email.php
          Extension.php
          Library.php
          License.php
          Manifest.php
          PhpExtensionRequirement.php
          PhpVersionRequirement.php
          Requirement.php
          RequirementCollection.php
          RequirementCollectionIterator.php
          Type.php
          Url.php
        xml/
          AuthorElement.php
          AuthorElementCollection.php
          BundlesElement.php
          ComponentElement.php
          ComponentElementCollection.php
          ContainsElement.php
          CopyrightElement.php
          ElementCollection.php
          ExtElement.php
          ExtElementCollection.php
          ExtensionElement.php
          LicenseElement.php
          ManifestDocument.php
          ManifestElement.php
          PhpElement.php
          RequiresElement.php
        ManifestDocumentMapper.php
        ManifestLoader.php
        ManifestSerializer.php
      tools/
        php-cs-fixer.d/
          header.txt
          PhpdocSingleLineVarFixer.php
      .php-cs-fixer.dist.php
      CHANGELOG.md
      composer.json
      composer.lock
      LICENSE
      manifest.xsd
      README.md
    version/
      src/
        constraints/
          AbstractVersionConstraint.php
          AndVersionConstraintGroup.php
          AnyVersionConstraint.php
          ExactVersionConstraint.php
          GreaterThanOrEqualToVersionConstraint.php
          OrVersionConstraintGroup.php
          SpecificMajorAndMinorVersionConstraint.php
          SpecificMajorVersionConstraint.php
          VersionConstraint.php
        exceptions/
          Exception.php
          InvalidPreReleaseSuffixException.php
          InvalidVersionException.php
          NoBuildMetaDataException.php
          NoPreReleaseSuffixException.php
          UnsupportedVersionConstraintException.php
        BuildMetaData.php
        PreReleaseSuffix.php
        Version.php
        VersionConstraintParser.php
        VersionConstraintValue.php
        VersionNumber.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
  phpoption/
    phpoption/
      src/
        PhpOption/
          LazyOption.php
          None.php
          Option.php
          Some.php
      composer.json
      LICENSE
  phpunit/
    php-code-coverage/
      src/
        Data/
          ProcessedCodeCoverageData.php
          RawCodeCoverageData.php
        Driver/
          Driver.php
          PcovDriver.php
          Selector.php
          XdebugDriver.php
        Exception/
          BranchAndPathCoverageNotSupportedException.php
          DeadCodeDetectionNotSupportedException.php
          DirectoryCouldNotBeCreatedException.php
          Exception.php
          FileCouldNotBeWrittenException.php
          InvalidArgumentException.php
          NoCodeCoverageDriverAvailableException.php
          NoCodeCoverageDriverWithPathCoverageSupportAvailableException.php
          ParserException.php
          PathExistsButIsNotDirectoryException.php
          PcovNotAvailableException.php
          ReflectionException.php
          ReportAlreadyFinalizedException.php
          StaticAnalysisCacheNotConfiguredException.php
          TestIdMissingException.php
          UnintentionallyCoveredCodeException.php
          WriteOperationFailedException.php
          XdebugNotAvailableException.php
          XdebugNotEnabledException.php
          XmlException.php
        Node/
          AbstractNode.php
          Builder.php
          CrapIndex.php
          Directory.php
          File.php
          Iterator.php
        Report/
          Html/
            Renderer/
              Template/
                css/
                  bootstrap.min.css
                  custom.css
                  nv.d3.min.css
                  octicons.css
                  style.css
                icons/
                  file-code.svg
                  file-directory.svg
                js/
                  bootstrap.bundle.min.js
                  d3.min.js
                  file.js
                  jquery.min.js
                  nv.d3.min.js
                branches.html.dist
                coverage_bar_branch.html.dist
                coverage_bar.html.dist
                dashboard_branch.html.dist
                dashboard.html.dist
                directory_branch.html.dist
                directory_item_branch.html.dist
                directory_item.html.dist
                directory.html.dist
                file_branch.html.dist
                file_item_branch.html.dist
                file_item.html.dist
                file.html.dist
                line.html.dist
                lines.html.dist
                method_item_branch.html.dist
                method_item.html.dist
                paths.html.dist
              Dashboard.php
              Directory.php
              File.php
            Colors.php
            CustomCssFile.php
            Facade.php
            Renderer.php
          Xml/
            BuildInformation.php
            Coverage.php
            Directory.php
            Facade.php
            File.php
            Method.php
            Node.php
            Project.php
            Report.php
            Source.php
            Tests.php
            Totals.php
            Unit.php
          Clover.php
          Cobertura.php
          Crap4j.php
          PHP.php
          Text.php
          Thresholds.php
        StaticAnalysis/
          CacheWarmer.php
          CachingFileAnalyser.php
          CodeUnitFindingVisitor.php
          ExecutableLinesFindingVisitor.php
          FileAnalyser.php
          IgnoredLinesFindingVisitor.php
          ParsingFileAnalyser.php
        TestSize/
          Known.php
          Large.php
          Medium.php
          Small.php
          TestSize.php
          Unknown.php
        TestStatus/
          Failure.php
          Known.php
          Success.php
          TestStatus.php
          Unknown.php
        Util/
          Filesystem.php
          Percentage.php
        CodeCoverage.php
        Filter.php
        Version.php
      ChangeLog-11.0.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    php-file-iterator/
      src/
        ExcludeIterator.php
        Facade.php
        Factory.php
        Iterator.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    php-invoker/
      src/
        exceptions/
          Exception.php
          ProcessControlExtensionNotLoadedException.php
          TimeoutException.php
        Invoker.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    php-text-template/
      .psalm/
        baseline.xml
        config.xml
      src/
        exceptions/
          Exception.php
          InvalidArgumentException.php
          RuntimeException.php
        Template.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    php-timer/
      src/
        exceptions/
          Exception.php
          NoActiveTimerException.php
          TimeSinceStartOfRequestNotAvailableException.php
        Duration.php
        ResourceUsageFormatter.php
        Timer.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    phpunit/
      schema/
        8.5.xsd
        9.0.xsd
        9.1.xsd
        9.2.xsd
        9.3.xsd
        9.4.xsd
        9.5.xsd
        10.0.xsd
        10.1.xsd
        10.2.xsd
        10.3.xsd
        10.4.xsd
        10.5.xsd
        11.0.xsd
        11.1.xsd
        11.2.xsd
        11.3.xsd
        11.4.xsd
      src/
        Event/
          Dispatcher/
            CollectingDispatcher.php
            DeferringDispatcher.php
            DirectDispatcher.php
            Dispatcher.php
            SubscribableDispatcher.php
          Emitter/
            DispatchingEmitter.php
            Emitter.php
          Events/
            Application/
              Finished.php
              FinishedSubscriber.php
              Started.php
              StartedSubscriber.php
            Test/
              HookMethod/
                AfterLastTestMethodCalled.php
                AfterLastTestMethodCalledSubscriber.php
                AfterLastTestMethodErrored.php
                AfterLastTestMethodErroredSubscriber.php
                AfterLastTestMethodFinished.php
                AfterLastTestMethodFinishedSubscriber.php
                AfterTestMethodCalled.php
                AfterTestMethodCalledSubscriber.php
                AfterTestMethodErrored.php
                AfterTestMethodErroredSubscriber.php
                AfterTestMethodFinished.php
                AfterTestMethodFinishedSubscriber.php
                BeforeFirstTestMethodCalled.php
                BeforeFirstTestMethodCalledSubscriber.php
                BeforeFirstTestMethodErrored.php
                BeforeFirstTestMethodErroredSubscriber.php
                BeforeFirstTestMethodFinished.php
                BeforeFirstTestMethodFinishedSubscriber.php
                BeforeTestMethodCalled.php
                BeforeTestMethodCalledSubscriber.php
                BeforeTestMethodErrored.php
                BeforeTestMethodErroredSubscriber.php
                BeforeTestMethodFinished.php
                BeforeTestMethodFinishedSubscriber.php
                PostConditionCalled.php
                PostConditionCalledSubscriber.php
                PostConditionErrored.php
                PostConditionErroredSubscriber.php
                PostConditionFinished.php
                PostConditionFinishedSubscriber.php
                PreConditionCalled.php
                PreConditionCalledSubscriber.php
                PreConditionErrored.php
                PreConditionErroredSubscriber.php
                PreConditionFinished.php
                PreConditionFinishedSubscriber.php
              Issue/
                ConsideredRisky.php
                ConsideredRiskySubscriber.php
                DeprecationTriggered.php
                DeprecationTriggeredSubscriber.php
                ErrorTriggered.php
                ErrorTriggeredSubscriber.php
                NoticeTriggered.php
                NoticeTriggeredSubscriber.php
                PhpDeprecationTriggered.php
                PhpDeprecationTriggeredSubscriber.php
                PhpNoticeTriggered.php
                PhpNoticeTriggeredSubscriber.php
                PhpunitDeprecationTriggered.php
                PhpunitDeprecationTriggeredSubscriber.php
                PhpunitErrorTriggered.php
                PhpunitErrorTriggeredSubscriber.php
                PhpunitWarningTriggered.php
                PhpunitWarningTriggeredSubscriber.php
                PhpWarningTriggered.php
                PhpWarningTriggeredSubscriber.php
                WarningTriggered.php
                WarningTriggeredSubscriber.php
              Lifecycle/
                DataProviderMethodCalled.php
                DataProviderMethodCalledSubscriber.php
                DataProviderMethodFinished.php
                DataProviderMethodFinishedSubscriber.php
                Finished.php
                FinishedSubscriber.php
                PreparationFailed.php
                PreparationFailedSubscriber.php
                PreparationStarted.php
                PreparationStartedSubscriber.php
                Prepared.php
                PreparedSubscriber.php
              Outcome/
                Errored.php
                ErroredSubscriber.php
                Failed.php
                FailedSubscriber.php
                MarkedIncomplete.php
                MarkedIncompleteSubscriber.php
                Passed.php
                PassedSubscriber.php
                Skipped.php
                SkippedSubscriber.php
              TestDouble/
                MockObjectCreated.php
                MockObjectCreatedSubscriber.php
                MockObjectForAbstractClassCreated.php
                MockObjectForAbstractClassCreatedSubscriber.php
                MockObjectForIntersectionOfInterfacesCreated.php
                MockObjectForIntersectionOfInterfacesCreatedSubscriber.php
                MockObjectForTraitCreated.php
                MockObjectForTraitCreatedSubscriber.php
                MockObjectFromWsdlCreated.php
                MockObjectFromWsdlCreatedSubscriber.php
                PartialMockObjectCreated.php
                PartialMockObjectCreatedSubscriber.php
                TestProxyCreated.php
                TestProxyCreatedSubscriber.php
                TestStubCreated.php
                TestStubCreatedSubscriber.php
                TestStubForIntersectionOfInterfacesCreated.php
                TestStubForIntersectionOfInterfacesCreatedSubscriber.php
              ComparatorRegistered.php
              ComparatorRegisteredSubscriber.php
              PrintedUnexpectedOutput.php
              PrintedUnexpectedOutputSubscriber.php
            TestRunner/
              BootstrapFinished.php
              BootstrapFinishedSubscriber.php
              ChildProcessFinished.php
              ChildProcessFinishedSubscriber.php
              ChildProcessStarted.php
              ChildProcessStartedSubscriber.php
              Configured.php
              ConfiguredSubscriber.php
              DeprecationTriggered.php
              DeprecationTriggeredSubscriber.php
              EventFacadeSealed.php
              EventFacadeSealedSubscriber.php
              ExecutionAborted.php
              ExecutionAbortedSubscriber.php
              ExecutionFinished.php
              ExecutionFinishedSubscriber.php
              ExecutionStarted.php
              ExecutionStartedSubscriber.php
              ExtensionBootstrapped.php
              ExtensionBootstrappedSubscriber.php
              ExtensionLoadedFromPhar.php
              ExtensionLoadedFromPharSubscriber.php
              Finished.php
              FinishedSubscriber.php
              GarbageCollectionDisabled.php
              GarbageCollectionDisabledSubscriber.php
              GarbageCollectionEnabled.php
              GarbageCollectionEnabledSubscriber.php
              GarbageCollectionTriggered.php
              GarbageCollectionTriggeredSubscriber.php
              Started.php
              StartedSubscriber.php
              WarningTriggered.php
              WarningTriggeredSubscriber.php
            TestSuite/
              Filtered.php
              FilteredSubscriber.php
              Finished.php
              FinishedSubscriber.php
              Loaded.php
              LoadedSubscriber.php
              Skipped.php
              SkippedSubscriber.php
              Sorted.php
              SortedSubscriber.php
              Started.php
              StartedSubscriber.php
            Event.php
            EventCollection.php
            EventCollectionIterator.php
          Exception/
            EventAlreadyAssignedException.php
            EventFacadeIsSealedException.php
            Exception.php
            InvalidArgumentException.php
            InvalidEventException.php
            InvalidSubscriberException.php
            MapError.php
            NoComparisonFailureException.php
            NoDataSetFromDataProviderException.php
            NoPreviousThrowableException.php
            NoTestCaseObjectOnCallStackException.php
            RuntimeException.php
            SubscriberTypeAlreadyRegisteredException.php
            UnknownEventException.php
            UnknownEventTypeException.php
            UnknownSubscriberException.php
            UnknownSubscriberTypeException.php
          Value/
            Runtime/
              OperatingSystem.php
              PHP.php
              PHPUnit.php
              Runtime.php
            Telemetry/
              Duration.php
              GarbageCollectorStatus.php
              GarbageCollectorStatusProvider.php
              HRTime.php
              Info.php
              MemoryMeter.php
              MemoryUsage.php
              Php81GarbageCollectorStatusProvider.php
              Php83GarbageCollectorStatusProvider.php
              Snapshot.php
              StopWatch.php
              System.php
              SystemMemoryMeter.php
              SystemStopWatch.php
              SystemStopWatchWithOffset.php
            Test/
              Issue/
                DirectTrigger.php
                IndirectTrigger.php
                IssueTrigger.php
                SelfTrigger.php
                TestTrigger.php
                UnknownTrigger.php
              TestData/
                DataFromDataProvider.php
                DataFromTestDependency.php
                TestData.php
                TestDataCollection.php
                TestDataCollectionIterator.php
              Phpt.php
              Test.php
              TestCollection.php
              TestCollectionIterator.php
              TestDox.php
              TestDoxBuilder.php
              TestMethod.php
              TestMethodBuilder.php
            TestSuite/
              TestSuite.php
              TestSuiteBuilder.php
              TestSuiteForTestClass.php
              TestSuiteForTestMethodWithDataProvider.php
              TestSuiteWithName.php
            ClassMethod.php
            ComparisonFailure.php
            ComparisonFailureBuilder.php
            Throwable.php
            ThrowableBuilder.php
          Facade.php
          Subscriber.php
          Tracer.php
          TypeMap.php
        Framework/
          Assert/
            Functions.php
          Attributes/
            After.php
            AfterClass.php
            BackupGlobals.php
            BackupStaticProperties.php
            Before.php
            BeforeClass.php
            CoversClass.php
            CoversFunction.php
            CoversMethod.php
            CoversNothing.php
            CoversTrait.php
            DataProvider.php
            DataProviderExternal.php
            Depends.php
            DependsExternal.php
            DependsExternalUsingDeepClone.php
            DependsExternalUsingShallowClone.php
            DependsOnClass.php
            DependsOnClassUsingDeepClone.php
            DependsOnClassUsingShallowClone.php
            DependsUsingDeepClone.php
            DependsUsingShallowClone.php
            DisableReturnValueGenerationForTestDoubles.php
            DoesNotPerformAssertions.php
            ExcludeGlobalVariableFromBackup.php
            ExcludeStaticPropertyFromBackup.php
            Group.php
            IgnoreDeprecations.php
            IgnorePhpunitDeprecations.php
            Large.php
            Medium.php
            PostCondition.php
            PreCondition.php
            PreserveGlobalState.php
            RequiresFunction.php
            RequiresMethod.php
            RequiresOperatingSystem.php
            RequiresOperatingSystemFamily.php
            RequiresPhp.php
            RequiresPhpExtension.php
            RequiresPhpunit.php
            RequiresPhpunitExtension.php
            RequiresSetting.php
            RunClassInSeparateProcess.php
            RunInSeparateProcess.php
            RunTestsInSeparateProcesses.php
            Small.php
            Test.php
            TestDox.php
            TestWith.php
            TestWithJson.php
            Ticket.php
            UsesClass.php
            UsesFunction.php
            UsesMethod.php
            UsesTrait.php
            WithoutErrorHandler.php
          Constraint/
            Boolean/
              IsFalse.php
              IsTrue.php
            Cardinality/
              Count.php
              GreaterThan.php
              IsEmpty.php
              LessThan.php
              SameSize.php
            Equality/
              IsEqual.php
              IsEqualCanonicalizing.php
              IsEqualIgnoringCase.php
              IsEqualWithDelta.php
            Exception/
              Exception.php
              ExceptionCode.php
              ExceptionMessageIsOrContains.php
              ExceptionMessageMatchesRegularExpression.php
            Filesystem/
              DirectoryExists.php
              FileExists.php
              IsReadable.php
              IsWritable.php
            Math/
              IsFinite.php
              IsInfinite.php
              IsNan.php
            Object/
              ObjectEquals.php
              ObjectHasProperty.php
            Operator/
              BinaryOperator.php
              LogicalAnd.php
              LogicalNot.php
              LogicalOr.php
              LogicalXor.php
              Operator.php
              UnaryOperator.php
            String/
              IsJson.php
              RegularExpression.php
              StringContains.php
              StringEndsWith.php
              StringEqualsStringIgnoringLineEndings.php
              StringMatchesFormatDescription.php
              StringStartsWith.php
            Traversable/
              ArrayHasKey.php
              IsList.php
              TraversableContains.php
              TraversableContainsEqual.php
              TraversableContainsIdentical.php
              TraversableContainsOnly.php
            Type/
              IsInstanceOf.php
              IsNull.php
              IsType.php
            Callback.php
            Constraint.php
            IsAnything.php
            IsIdentical.php
            JsonMatches.php
          Exception/
            Incomplete/
              IncompleteTest.php
              IncompleteTestError.php
            ObjectEquals/
              ActualValueIsNotAnObjectException.php
              ComparisonMethodDoesNotAcceptParameterTypeException.php
              ComparisonMethodDoesNotDeclareBoolReturnTypeException.php
              ComparisonMethodDoesNotDeclareExactlyOneParameterException.php
              ComparisonMethodDoesNotDeclareParameterTypeException.php
              ComparisonMethodDoesNotExistException.php
            Skipped/
              SkippedTest.php
              SkippedTestSuiteError.php
              SkippedWithMessageException.php
            AssertionFailedError.php
            CodeCoverageException.php
            EmptyStringException.php
            Exception.php
            ExpectationFailedException.php
            GeneratorNotSupportedException.php
            InvalidArgumentException.php
            InvalidCoversTargetException.php
            InvalidDataProviderException.php
            InvalidDependencyException.php
            NoChildTestSuiteException.php
            PhptAssertionFailedError.php
            ProcessIsolationException.php
            UnknownClassOrInterfaceException.php
            UnknownTypeException.php
          MockObject/
            Exception/
              BadMethodCallException.php
              CannotCloneTestDoubleForReadonlyClassException.php
              CannotUseOnlyMethodsException.php
              Exception.php
              IncompatibleReturnValueException.php
              MatchBuilderNotFoundException.php
              MatcherAlreadyRegisteredException.php
              MethodCannotBeConfiguredException.php
              MethodNameAlreadyConfiguredException.php
              MethodNameNotConfiguredException.php
              MethodParametersAlreadyConfiguredException.php
              NeverReturningMethodException.php
              NoMoreReturnValuesConfiguredException.php
              ReturnValueNotConfiguredException.php
              RuntimeException.php
            Generator/
              Exception/
                CannotUseAddMethodsException.php
                ClassIsEnumerationException.php
                ClassIsFinalException.php
                DuplicateMethodException.php
                Exception.php
                InvalidMethodNameException.php
                NameAlreadyInUseException.php
                OriginalConstructorInvocationRequiredException.php
                ReflectionException.php
                RuntimeException.php
                SoapExtensionNotAvailableException.php
                UnknownClassException.php
                UnknownInterfaceException.php
                UnknownTraitException.php
                UnknownTypeException.php
              templates/
                deprecation.tpl
                doubled_method.tpl
                doubled_static_method.tpl
                intersection.tpl
                proxied_method.tpl
                test_double_class.tpl
                trait_class.tpl
                wsdl_class.tpl
                wsdl_method.tpl
              Generator.php
              HookedProperty.php
              HookedPropertyGenerator.php
              MockClass.php
              MockMethod.php
              MockMethodSet.php
              MockTrait.php
              MockType.php
              TemplateLoader.php
            Runtime/
              Api/
                DoubledCloneMethod.php
                ErrorCloneMethod.php
                GeneratedAsMockObject.php
                GeneratedAsTestStub.php
                Method.php
                MockObjectApi.php
                MutableStubApi.php
                ProxiedCloneMethod.php
                StubApi.php
                TestDoubleState.php
              Builder/
                Identity.php
                InvocationMocker.php
                InvocationStubber.php
                MethodNameMatch.php
                ParametersMatch.php
                Stub.php
              Interface/
                MockObject.php
                MockObjectInternal.php
                Stub.php
                StubInternal.php
              PropertyHook/
                PropertyGetHook.php
                PropertyHook.php
                PropertySetHook.php
              Rule/
                AnyInvokedCount.php
                AnyParameters.php
                InvocationOrder.php
                InvokedAtLeastCount.php
                InvokedAtLeastOnce.php
                InvokedAtMostCount.php
                InvokedCount.php
                MethodName.php
                Parameters.php
                ParametersRule.php
              Stub/
                ConsecutiveCalls.php
                Exception.php
                ReturnArgument.php
                ReturnCallback.php
                ReturnReference.php
                ReturnSelf.php
                ReturnStub.php
                ReturnValueMap.php
                Stub.php
              Invocation.php
              InvocationHandler.php
              Matcher.php
              MethodNameConstraint.php
              ReturnValueGenerator.php
            ConfigurableMethod.php
            MockBuilder.php
          TestRunner/
            templates/
              class.tpl
              method.tpl
            ChildProcessResultProcessor.php
            IsolatedTestRunner.php
            IsolatedTestRunnerRegistry.php
            SeparateProcessTestRunner.php
            TestRunner.php
          TestSize/
            Known.php
            Large.php
            Medium.php
            Small.php
            TestSize.php
            Unknown.php
          TestStatus/
            Deprecation.php
            Error.php
            Failure.php
            Incomplete.php
            Known.php
            Notice.php
            Risky.php
            Skipped.php
            Success.php
            TestStatus.php
            Unknown.php
            Warning.php
          Assert.php
          DataProviderTestSuite.php
          ExecutionOrderDependency.php
          NativeType.php
          Reorderable.php
          SelfDescribing.php
          Test.php
          TestBuilder.php
          TestCase.php
          TestSuite.php
          TestSuiteIterator.php
        Logging/
          JUnit/
            Subscriber/
              Subscriber.php
              TestErroredSubscriber.php
              TestFailedSubscriber.php
              TestFinishedSubscriber.php
              TestMarkedIncompleteSubscriber.php
              TestPreparationFailedSubscriber.php
              TestPreparationStartedSubscriber.php
              TestPreparedSubscriber.php
              TestPrintedUnexpectedOutputSubscriber.php
              TestRunnerExecutionFinishedSubscriber.php
              TestSkippedSubscriber.php
              TestSuiteFinishedSubscriber.php
              TestSuiteStartedSubscriber.php
            JunitXmlLogger.php
          TeamCity/
            Subscriber/
              Subscriber.php
              TestConsideredRiskySubscriber.php
              TestErroredSubscriber.php
              TestFailedSubscriber.php
              TestFinishedSubscriber.php
              TestMarkedIncompleteSubscriber.php
              TestPreparedSubscriber.php
              TestRunnerExecutionFinishedSubscriber.php
              TestSkippedSubscriber.php
              TestSuiteBeforeFirstTestMethodErroredSubscriber.php
              TestSuiteFinishedSubscriber.php
              TestSuiteSkippedSubscriber.php
              TestSuiteStartedSubscriber.php
            TeamCityLogger.php
          TestDox/
            TestResult/
              Subscriber/
                Subscriber.php
                TestConsideredRiskySubscriber.php
                TestErroredSubscriber.php
                TestFailedSubscriber.php
                TestFinishedSubscriber.php
                TestMarkedIncompleteSubscriber.php
                TestPassedSubscriber.php
                TestPreparedSubscriber.php
                TestSkippedSubscriber.php
                TestTriggeredDeprecationSubscriber.php
                TestTriggeredNoticeSubscriber.php
                TestTriggeredPhpDeprecationSubscriber.php
                TestTriggeredPhpNoticeSubscriber.php
                TestTriggeredPhpunitDeprecationSubscriber.php
                TestTriggeredPhpunitErrorSubscriber.php
                TestTriggeredPhpunitWarningSubscriber.php
                TestTriggeredPhpWarningSubscriber.php
                TestTriggeredWarningSubscriber.php
              TestResult.php
              TestResultCollection.php
              TestResultCollectionIterator.php
              TestResultCollector.php
            HtmlRenderer.php
            NamePrettifier.php
            PlainTextRenderer.php
          EventLogger.php
        Metadata/
          Api/
            CodeCoverage.php
            DataProvider.php
            Dependencies.php
            Groups.php
            HookMethods.php
            Requirements.php
          Exception/
            AnnotationsAreNotSupportedForInternalClassesException.php
            Exception.php
            InvalidAttributeException.php
            InvalidVersionRequirementException.php
            NoVersionRequirementException.php
            ReflectionException.php
          Parser/
            Annotation/
              DocBlock.php
              Registry.php
            AnnotationParser.php
            AttributeParser.php
            CachingParser.php
            Parser.php
            ParserChain.php
            Registry.php
          Version/
            ComparisonRequirement.php
            ConstraintRequirement.php
            Requirement.php
          After.php
          AfterClass.php
          BackupGlobals.php
          BackupStaticProperties.php
          Before.php
          BeforeClass.php
          Covers.php
          CoversClass.php
          CoversDefaultClass.php
          CoversFunction.php
          CoversMethod.php
          CoversNothing.php
          CoversTrait.php
          DataProvider.php
          DependsOnClass.php
          DependsOnMethod.php
          DisableReturnValueGenerationForTestDoubles.php
          DoesNotPerformAssertions.php
          ExcludeGlobalVariableFromBackup.php
          ExcludeStaticPropertyFromBackup.php
          Group.php
          IgnoreDeprecations.php
          IgnorePhpunitDeprecations.php
          Metadata.php
          MetadataCollection.php
          MetadataCollectionIterator.php
          PostCondition.php
          PreCondition.php
          PreserveGlobalState.php
          RequiresFunction.php
          RequiresMethod.php
          RequiresOperatingSystem.php
          RequiresOperatingSystemFamily.php
          RequiresPhp.php
          RequiresPhpExtension.php
          RequiresPhpunit.php
          RequiresPhpunitExtension.php
          RequiresSetting.php
          RunClassInSeparateProcess.php
          RunInSeparateProcess.php
          RunTestsInSeparateProcesses.php
          Test.php
          TestDox.php
          TestWith.php
          Uses.php
          UsesClass.php
          UsesDefaultClass.php
          UsesFunction.php
          UsesMethod.php
          UsesTrait.php
          WithoutErrorHandler.php
        Runner/
          Baseline/
            Exception/
              CannotLoadBaselineException.php
              CannotWriteBaselineException.php
              FileDoesNotHaveLineException.php
            Subscriber/
              Subscriber.php
              TestTriggeredDeprecationSubscriber.php
              TestTriggeredNoticeSubscriber.php
              TestTriggeredPhpDeprecationSubscriber.php
              TestTriggeredPhpNoticeSubscriber.php
              TestTriggeredPhpWarningSubscriber.php
              TestTriggeredWarningSubscriber.php
            Baseline.php
            Generator.php
            Issue.php
            Reader.php
            RelativePathCalculator.php
            Writer.php
          DeprecationCollector/
            Subscriber/
              Subscriber.php
              TestPreparedSubscriber.php
              TestTriggeredDeprecationSubscriber.php
            Collector.php
            Facade.php
            InIsolationCollector.php
          Exception/
            ClassCannotBeFoundException.php
            ClassDoesNotExtendTestCaseException.php
            ClassIsAbstractException.php
            DirectoryDoesNotExistException.php
            ErrorException.php
            Exception.php
            FileDoesNotExistException.php
            InvalidOrderException.php
            InvalidPhptFileException.php
            ParameterDoesNotExistException.php
            PhptExternalFileCannotBeLoadedException.php
            UnsupportedPhptSectionException.php
          Extension/
            Extension.php
            ExtensionBootstrapper.php
            Facade.php
            ParameterCollection.php
            PharLoader.php
          Filter/
            ExcludeGroupFilterIterator.php
            ExcludeNameFilterIterator.php
            Factory.php
            GroupFilterIterator.php
            IncludeGroupFilterIterator.php
            IncludeNameFilterIterator.php
            NameFilterIterator.php
            TestIdFilterIterator.php
          GarbageCollection/
            Subscriber/
              ExecutionFinishedSubscriber.php
              ExecutionStartedSubscriber.php
              Subscriber.php
              TestFinishedSubscriber.php
            GarbageCollectionHandler.php
          HookMethod/
            HookMethod.php
            HookMethodCollection.php
          PHPT/
            templates/
              phpt.tpl
            PhptTestCase.php
          ResultCache/
            Subscriber/
              Subscriber.php
              TestConsideredRiskySubscriber.php
              TestErroredSubscriber.php
              TestFailedSubscriber.php
              TestFinishedSubscriber.php
              TestMarkedIncompleteSubscriber.php
              TestPreparedSubscriber.php
              TestSkippedSubscriber.php
              TestSuiteFinishedSubscriber.php
              TestSuiteStartedSubscriber.php
            DefaultResultCache.php
            NullResultCache.php
            ResultCache.php
            ResultCacheHandler.php
            ResultCacheId.php
          TestResult/
            Subscriber/
              AfterTestClassMethodErroredSubscriber.php
              BeforeTestClassMethodErroredSubscriber.php
              ExecutionStartedSubscriber.php
              Subscriber.php
              TestConsideredRiskySubscriber.php
              TestErroredSubscriber.php
              TestFailedSubscriber.php
              TestFinishedSubscriber.php
              TestMarkedIncompleteSubscriber.php
              TestPreparedSubscriber.php
              TestRunnerTriggeredDeprecationSubscriber.php
              TestRunnerTriggeredWarningSubscriber.php
              TestSkippedSubscriber.php
              TestSuiteFinishedSubscriber.php
              TestSuiteSkippedSubscriber.php
              TestSuiteStartedSubscriber.php
              TestTriggeredDeprecationSubscriber.php
              TestTriggeredErrorSubscriber.php
              TestTriggeredNoticeSubscriber.php
              TestTriggeredPhpDeprecationSubscriber.php
              TestTriggeredPhpNoticeSubscriber.php
              TestTriggeredPhpunitDeprecationSubscriber.php
              TestTriggeredPhpunitErrorSubscriber.php
              TestTriggeredPhpunitWarningSubscriber.php
              TestTriggeredPhpWarningSubscriber.php
              TestTriggeredWarningSubscriber.php
            Collector.php
            Facade.php
            Issue.php
            PassedTests.php
            TestResult.php
          CodeCoverage.php
          ErrorHandler.php
          IssueFilter.php
          TestSuiteLoader.php
          TestSuiteSorter.php
          Version.php
        TextUI/
          Command/
            Commands/
              AtLeastVersionCommand.php
              CheckPhpConfigurationCommand.php
              GenerateConfigurationCommand.php
              ListGroupsCommand.php
              ListTestFilesCommand.php
              ListTestsAsTextCommand.php
              ListTestsAsXmlCommand.php
              ListTestSuitesCommand.php
              MigrateConfigurationCommand.php
              ShowHelpCommand.php
              ShowVersionCommand.php
              VersionCheckCommand.php
              WarmCodeCoverageCacheCommand.php
            Command.php
            Result.php
          Configuration/
            Cli/
              Builder.php
              Configuration.php
              Exception.php
              XmlConfigurationFileFinder.php
            Exception/
              CannotFindSchemaException.php
              CodeCoverageReportNotConfiguredException.php
              ConfigurationCannotBeBuiltException.php
              Exception.php
              FilterNotConfiguredException.php
              LoggingNotConfiguredException.php
              NoBaselineException.php
              NoBootstrapException.php
              NoCacheDirectoryException.php
              NoConfigurationFileException.php
              NoCoverageCacheDirectoryException.php
              NoCustomCssFileException.php
              NoDefaultTestSuiteException.php
              NoPharExtensionDirectoryException.php
              SpecificDeprecationToStopOnNotConfiguredException.php
            Value/
              Constant.php
              ConstantCollection.php
              ConstantCollectionIterator.php
              Directory.php
              DirectoryCollection.php
              DirectoryCollectionIterator.php
              ExtensionBootstrap.php
              ExtensionBootstrapCollection.php
              ExtensionBootstrapCollectionIterator.php
              File.php
              FileCollection.php
              FileCollectionIterator.php
              FilterDirectory.php
              FilterDirectoryCollection.php
              FilterDirectoryCollectionIterator.php
              Group.php
              GroupCollection.php
              GroupCollectionIterator.php
              IniSetting.php
              IniSettingCollection.php
              IniSettingCollectionIterator.php
              Php.php
              Source.php
              TestDirectory.php
              TestDirectoryCollection.php
              TestDirectoryCollectionIterator.php
              TestFile.php
              TestFileCollection.php
              TestFileCollectionIterator.php
              TestSuite.php
              TestSuiteCollection.php
              TestSuiteCollectionIterator.php
              Variable.php
              VariableCollection.php
              VariableCollectionIterator.php
            Xml/
              CodeCoverage/
                Report/
                  Clover.php
                  Cobertura.php
                  Crap4j.php
                  Html.php
                  Php.php
                  Text.php
                  Xml.php
                CodeCoverage.php
              Logging/
                TestDox/
                  Html.php
                  Text.php
                Junit.php
                Logging.php
                TeamCity.php
              Migration/
                Migrations/
                  ConvertLogTypes.php
                  CoverageCloverToReport.php
                  CoverageCrap4jToReport.php
                  CoverageHtmlToReport.php
                  CoveragePhpToReport.php
                  CoverageTextToReport.php
                  CoverageXmlToReport.php
                  IntroduceCacheDirectoryAttribute.php
                  IntroduceCoverageElement.php
                  LogToReportMigration.php
                  Migration.php
                  MoveAttributesFromFilterWhitelistToCoverage.php
                  MoveAttributesFromRootToCoverage.php
                  MoveCoverageDirectoriesToSource.php
                  MoveWhitelistExcludesToCoverage.php
                  MoveWhitelistIncludesToCoverage.php
                  RemoveBeStrictAboutResourceUsageDuringSmallTestsAttribute.php
                  RemoveBeStrictAboutTodoAnnotatedTestsAttribute.php
                  RemoveCacheResultFileAttribute.php
                  RemoveCacheTokensAttribute.php
                  RemoveConversionToExceptionsAttributes.php
                  RemoveCoverageElementCacheDirectoryAttribute.php
                  RemoveCoverageElementProcessUncoveredFilesAttribute.php
                  RemoveEmptyFilter.php
                  RemoveListeners.php
                  RemoveLoggingElements.php
                  RemoveLogTypes.php
                  RemoveNoInteractionAttribute.php
                  RemovePrinterAttributes.php
                  RemoveRegisterMockObjectsFromTestArgumentsRecursivelyAttribute.php
                  RemoveTestDoxGroupsElement.php
                  RemoveTestSuiteLoaderAttributes.php
                  RemoveVerboseAttribute.php
                  RenameBackupStaticAttributesAttribute.php
                  RenameBeStrictAboutCoversAnnotationAttribute.php
                  RenameForceCoversAnnotationAttribute.php
                  ReplaceRestrictDeprecationsWithIgnoreDeprecations.php
                  UpdateSchemaLocation.php
                MigrationBuilder.php
                MigrationException.php
                Migrator.php
                SnapshotNodeList.php
              SchemaDetector/
                FailedSchemaDetectionResult.php
                SchemaDetectionResult.php
                SchemaDetector.php
                SuccessfulSchemaDetectionResult.php
              Validator/
                ValidationResult.php
                Validator.php
              Configuration.php
              DefaultConfiguration.php
              Exception.php
              Generator.php
              Groups.php
              LoadedFromFileConfiguration.php
              Loader.php
              PHPUnit.php
              SchemaFinder.php
              TestSuiteMapper.php
            Builder.php
            CodeCoverageFilterRegistry.php
            Configuration.php
            Merger.php
            PhpHandler.php
            Registry.php
            SourceFilter.php
            SourceMapper.php
            TestSuiteBuilder.php
          Exception/
            CannotOpenSocketException.php
            Exception.php
            InvalidSocketException.php
            RuntimeException.php
            TestDirectoryNotFoundException.php
            TestFileNotFoundException.php
          Output/
            Default/
              ProgressPrinter/
                Subscriber/
                  BeforeTestClassMethodErroredSubscriber.php
                  Subscriber.php
                  TestConsideredRiskySubscriber.php
                  TestErroredSubscriber.php
                  TestFailedSubscriber.php
                  TestFinishedSubscriber.php
                  TestMarkedIncompleteSubscriber.php
                  TestPreparedSubscriber.php
                  TestRunnerExecutionStartedSubscriber.php
                  TestSkippedSubscriber.php
                  TestTriggeredDeprecationSubscriber.php
                  TestTriggeredErrorSubscriber.php
                  TestTriggeredNoticeSubscriber.php
                  TestTriggeredPhpDeprecationSubscriber.php
                  TestTriggeredPhpNoticeSubscriber.php
                  TestTriggeredPhpunitDeprecationSubscriber.php
                  TestTriggeredPhpunitWarningSubscriber.php
                  TestTriggeredPhpWarningSubscriber.php
                  TestTriggeredWarningSubscriber.php
                ProgressPrinter.php
              ResultPrinter.php
              UnexpectedOutputPrinter.php
            Printer/
              DefaultPrinter.php
              NullPrinter.php
              Printer.php
            TestDox/
              ResultPrinter.php
            Facade.php
            SummaryPrinter.php
          Application.php
          Help.php
          ShellExitCodeCalculator.php
          TestRunner.php
          TestSuiteFilterProcessor.php
        Util/
          Exception/
            Exception.php
            InvalidDirectoryException.php
            InvalidJsonException.php
            InvalidVersionOperatorException.php
            PhpProcessException.php
            XmlException.php
          Http/
            Downloader.php
            PhpDownloader.php
          PHP/
            DefaultJobRunner.php
            Job.php
            JobRunner.php
            JobRunnerRegistry.php
            Result.php
          Xml/
            Loader.php
            Xml.php
          Cloner.php
          Color.php
          ExcludeList.php
          Exporter.php
          Filesystem.php
          Filter.php
          GlobalState.php
          Json.php
          Reflection.php
          Test.php
          ThrowableToStringMapper.php
          VersionComparisonOperator.php
        Exception.php
      ChangeLog-11.5.md
      composer.json
      composer.lock
      DEPRECATIONS.md
      LICENSE
      phpunit
      phpunit.xsd
      README.md
      SECURITY.md
  psr/
    clock/
      src/
        ClockInterface.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
    container/
      src/
        ContainerExceptionInterface.php
        ContainerInterface.php
        NotFoundExceptionInterface.php
      .gitignore
      composer.json
      LICENSE
      README.md
    event-dispatcher/
      src/
        EventDispatcherInterface.php
        ListenerProviderInterface.php
        StoppableEventInterface.php
      .editorconfig
      .gitignore
      composer.json
      LICENSE
      README.md
    http-client/
      src/
        ClientExceptionInterface.php
        ClientInterface.php
        NetworkExceptionInterface.php
        RequestExceptionInterface.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
    http-factory/
      src/
        RequestFactoryInterface.php
        ResponseFactoryInterface.php
        ServerRequestFactoryInterface.php
        StreamFactoryInterface.php
        UploadedFileFactoryInterface.php
        UriFactoryInterface.php
      composer.json
      LICENSE
      README.md
    http-message/
      docs/
        PSR7-Interfaces.md
        PSR7-Usage.md
      src/
        MessageInterface.php
        RequestInterface.php
        ResponseInterface.php
        ServerRequestInterface.php
        StreamInterface.php
        UploadedFileInterface.php
        UriInterface.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
    log/
      src/
        AbstractLogger.php
        InvalidArgumentException.php
        LoggerAwareInterface.php
        LoggerAwareTrait.php
        LoggerInterface.php
        LoggerTrait.php
        LogLevel.php
        NullLogger.php
      composer.json
      LICENSE
      README.md
    simple-cache/
      src/
        CacheException.php
        CacheInterface.php
        InvalidArgumentException.php
      .editorconfig
      composer.json
      LICENSE.md
      README.md
  psy/
    psysh/
      bin/
        psysh
      src/
        CodeCleaner/
          AbstractClassPass.php
          AssignThisVariablePass.php
          CalledClassPass.php
          CallTimePassByReferencePass.php
          CodeCleanerPass.php
          EmptyArrayDimFetchPass.php
          ExitPass.php
          FinalClassPass.php
          FunctionContextPass.php
          FunctionReturnInWriteContextPass.php
          ImplicitReturnPass.php
          IssetPass.php
          LabelContextPass.php
          LeavePsyshAlonePass.php
          ListPass.php
          LoopContextPass.php
          MagicConstantsPass.php
          NamespaceAwarePass.php
          NamespacePass.php
          NoReturnValue.php
          PassableByReferencePass.php
          RequirePass.php
          ReturnTypePass.php
          StrictTypesPass.php
          UseStatementPass.php
          ValidClassNamePass.php
          ValidConstructorPass.php
          ValidFunctionNamePass.php
        Command/
          ListCommand/
            ClassConstantEnumerator.php
            ClassEnumerator.php
            ConstantEnumerator.php
            Enumerator.php
            FunctionEnumerator.php
            GlobalVariableEnumerator.php
            MethodEnumerator.php
            PropertyEnumerator.php
            VariableEnumerator.php
          TimeitCommand/
            TimeitVisitor.php
          BufferCommand.php
          ClearCommand.php
          CodeArgumentParser.php
          Command.php
          DocCommand.php
          DumpCommand.php
          EditCommand.php
          ExitCommand.php
          HelpCommand.php
          HistoryCommand.php
          ListCommand.php
          ParseCommand.php
          PsyVersionCommand.php
          ReflectingCommand.php
          ShowCommand.php
          SudoCommand.php
          ThrowUpCommand.php
          TimeitCommand.php
          TraceCommand.php
          WhereamiCommand.php
          WtfCommand.php
        Exception/
          BreakException.php
          DeprecatedException.php
          ErrorException.php
          Exception.php
          FatalErrorException.php
          ParseErrorException.php
          RuntimeException.php
          ThrowUpException.php
          UnexpectedTargetException.php
        ExecutionLoop/
          AbstractListener.php
          Listener.php
          ProcessForker.php
          RunkitReloader.php
        Formatter/
          CodeFormatter.php
          DocblockFormatter.php
          ReflectorFormatter.php
          SignatureFormatter.php
          TraceFormatter.php
        Input/
          CodeArgument.php
          FilterOptions.php
          ShellInput.php
          SilentInput.php
        Output/
          OutputPager.php
          PassthruPager.php
          ProcOutputPager.php
          ShellOutput.php
          Theme.php
        Readline/
          Hoa/
            Terminfo/
              77/
                windows-ansi
              78/
                xterm
                xterm-256color
            Autocompleter.php
            AutocompleterAggregate.php
            AutocompleterPath.php
            AutocompleterWord.php
            Console.php
            ConsoleCursor.php
            ConsoleException.php
            ConsoleInput.php
            ConsoleOutput.php
            ConsoleProcessus.php
            ConsoleTput.php
            ConsoleWindow.php
            Event.php
            EventBucket.php
            EventException.php
            EventListenable.php
            EventListener.php
            EventListens.php
            EventSource.php
            Exception.php
            ExceptionIdle.php
            File.php
            FileDirectory.php
            FileDoesNotExistException.php
            FileException.php
            FileFinder.php
            FileGeneric.php
            FileLink.php
            FileLinkRead.php
            FileLinkReadWrite.php
            FileRead.php
            FileReadWrite.php
            IStream.php
            IteratorFileSystem.php
            IteratorRecursiveDirectory.php
            IteratorSplFileInfo.php
            Protocol.php
            ProtocolException.php
            ProtocolNode.php
            ProtocolNodeLibrary.php
            ProtocolWrapper.php
            Readline.php
            Stream.php
            StreamBufferable.php
            StreamContext.php
            StreamException.php
            StreamIn.php
            StreamLockable.php
            StreamOut.php
            StreamPathable.php
            StreamPointable.php
            StreamStatable.php
            StreamTouchable.php
            Ustring.php
            Xcallable.php
          GNUReadline.php
          Libedit.php
          Readline.php
          Transient.php
          Userland.php
        Reflection/
          ReflectionConstant.php
          ReflectionLanguageConstruct.php
          ReflectionLanguageConstructParameter.php
          ReflectionNamespace.php
        Sudo/
          SudoVisitor.php
        TabCompletion/
          Matcher/
            AbstractContextAwareMatcher.php
            AbstractDefaultParametersMatcher.php
            AbstractMatcher.php
            ClassAttributesMatcher.php
            ClassMethodDefaultParametersMatcher.php
            ClassMethodsMatcher.php
            ClassNamesMatcher.php
            CommandsMatcher.php
            ConstantsMatcher.php
            FunctionDefaultParametersMatcher.php
            FunctionsMatcher.php
            KeywordsMatcher.php
            MongoClientMatcher.php
            MongoDatabaseMatcher.php
            ObjectAttributesMatcher.php
            ObjectMethodDefaultParametersMatcher.php
            ObjectMethodsMatcher.php
            VariablesMatcher.php
          AutoCompleter.php
        Util/
          Docblock.php
          Json.php
          Mirror.php
          Str.php
        VarDumper/
          Cloner.php
          Dumper.php
          Presenter.php
          PresenterAware.php
        VersionUpdater/
          Downloader/
            CurlDownloader.php
            Factory.php
            FileDownloader.php
          Checker.php
          Downloader.php
          GitHubChecker.php
          Installer.php
          IntervalChecker.php
          NoopChecker.php
          SelfUpdate.php
        CodeCleaner.php
        ConfigPaths.php
        Configuration.php
        Context.php
        ContextAware.php
        EnvInterface.php
        ExecutionClosure.php
        ExecutionLoopClosure.php
        functions.php
        ParserFactory.php
        Shell.php
        Sudo.php
        SuperglobalsEnv.php
        SystemEnv.php
      composer.json
      LICENSE
      README.md
  ralouphie/
    getallheaders/
      src/
        getallheaders.php
      composer.json
      LICENSE
      README.md
  ramsey/
    collection/
      src/
        Exception/
          CollectionException.php
          CollectionMismatchException.php
          InvalidArgumentException.php
          InvalidPropertyOrMethod.php
          NoSuchElementException.php
          OutOfBoundsException.php
          UnsupportedOperationException.php
        Map/
          AbstractMap.php
          AbstractTypedMap.php
          AssociativeArrayMap.php
          MapInterface.php
          NamedParameterMap.php
          TypedMap.php
          TypedMapInterface.php
        Tool/
          TypeTrait.php
          ValueExtractorTrait.php
          ValueToStringTrait.php
        AbstractArray.php
        AbstractCollection.php
        AbstractSet.php
        ArrayInterface.php
        Collection.php
        CollectionInterface.php
        DoubleEndedQueue.php
        DoubleEndedQueueInterface.php
        GenericArray.php
        Queue.php
        QueueInterface.php
        Set.php
        Sort.php
      composer.json
      LICENSE
      README.md
      SECURITY.md
    uuid/
      src/
        Builder/
          BuilderCollection.php
          DefaultUuidBuilder.php
          DegradedUuidBuilder.php
          FallbackBuilder.php
          UuidBuilderInterface.php
        Codec/
          CodecInterface.php
          GuidStringCodec.php
          OrderedTimeCodec.php
          StringCodec.php
          TimestampFirstCombCodec.php
          TimestampLastCombCodec.php
        Converter/
          Number/
            BigNumberConverter.php
            DegradedNumberConverter.php
            GenericNumberConverter.php
          Time/
            BigNumberTimeConverter.php
            DegradedTimeConverter.php
            GenericTimeConverter.php
            PhpTimeConverter.php
            UnixTimeConverter.php
          NumberConverterInterface.php
          TimeConverterInterface.php
        Exception/
          BuilderNotFoundException.php
          DateTimeException.php
          DceSecurityException.php
          InvalidArgumentException.php
          InvalidBytesException.php
          InvalidUuidStringException.php
          NameException.php
          NodeException.php
          RandomSourceException.php
          TimeSourceException.php
          UnableToBuildUuidException.php
          UnsupportedOperationException.php
          UuidExceptionInterface.php
        Fields/
          FieldsInterface.php
          SerializableFieldsTrait.php
        Generator/
          CombGenerator.php
          DceSecurityGenerator.php
          DceSecurityGeneratorInterface.php
          DefaultNameGenerator.php
          DefaultTimeGenerator.php
          NameGeneratorFactory.php
          NameGeneratorInterface.php
          PeclUuidNameGenerator.php
          PeclUuidRandomGenerator.php
          PeclUuidTimeGenerator.php
          RandomBytesGenerator.php
          RandomGeneratorFactory.php
          RandomGeneratorInterface.php
          RandomLibAdapter.php
          TimeGeneratorFactory.php
          TimeGeneratorInterface.php
          UnixTimeGenerator.php
        Guid/
          Fields.php
          Guid.php
          GuidBuilder.php
        Lazy/
          LazyUuidFromString.php
        Math/
          BrickMathCalculator.php
          CalculatorInterface.php
          RoundingMode.php
        Nonstandard/
          Fields.php
          Uuid.php
          UuidBuilder.php
          UuidV6.php
        Provider/
          Dce/
            SystemDceSecurityProvider.php
          Node/
            FallbackNodeProvider.php
            NodeProviderCollection.php
            RandomNodeProvider.php
            StaticNodeProvider.php
            SystemNodeProvider.php
          Time/
            FixedTimeProvider.php
            SystemTimeProvider.php
          DceSecurityProviderInterface.php
          NodeProviderInterface.php
          TimeProviderInterface.php
        Rfc4122/
          Fields.php
          FieldsInterface.php
          MaxTrait.php
          MaxUuid.php
          NilTrait.php
          NilUuid.php
          TimeTrait.php
          UuidBuilder.php
          UuidInterface.php
          UuidV1.php
          UuidV2.php
          UuidV3.php
          UuidV4.php
          UuidV5.php
          UuidV6.php
          UuidV7.php
          UuidV8.php
          Validator.php
          VariantTrait.php
          VersionTrait.php
        Type/
          Decimal.php
          Hexadecimal.php
          Integer.php
          NumberInterface.php
          Time.php
          TypeInterface.php
        Validator/
          GenericValidator.php
          ValidatorInterface.php
        BinaryUtils.php
        DegradedUuid.php
        DeprecatedUuidInterface.php
        DeprecatedUuidMethodsTrait.php
        FeatureSet.php
        functions.php
        Uuid.php
        UuidFactory.php
        UuidFactoryInterface.php
        UuidInterface.php
      composer.json
      LICENSE
      README.md
  sebastian/
    cli-parser/
      src/
        exceptions/
          AmbiguousOptionException.php
          Exception.php
          OptionDoesNotAllowArgumentException.php
          RequiredOptionArgumentMissingException.php
          UnknownOptionException.php
        Parser.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    code-unit/
      src/
        exceptions/
          Exception.php
          InvalidCodeUnitException.php
          NoTraitException.php
          ReflectionException.php
        ClassMethodUnit.php
        ClassUnit.php
        CodeUnit.php
        CodeUnitCollection.php
        CodeUnitCollectionIterator.php
        FileUnit.php
        FunctionUnit.php
        InterfaceMethodUnit.php
        InterfaceUnit.php
        Mapper.php
        TraitMethodUnit.php
        TraitUnit.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    code-unit-reverse-lookup/
      src/
        Wizard.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    comparator/
      src/
        exceptions/
          Exception.php
          RuntimeException.php
        ArrayComparator.php
        Comparator.php
        ComparisonFailure.php
        DateTimeComparator.php
        DOMNodeComparator.php
        EnumerationComparator.php
        ExceptionComparator.php
        Factory.php
        MockObjectComparator.php
        NumberComparator.php
        NumericComparator.php
        ObjectComparator.php
        ResourceComparator.php
        ScalarComparator.php
        SplObjectStorageComparator.php
        TypeComparator.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    complexity/
      src/
        Complexity/
          Complexity.php
          ComplexityCollection.php
          ComplexityCollectionIterator.php
        Exception/
          Exception.php
          RuntimeException.php
        Visitor/
          ComplexityCalculatingVisitor.php
          CyclomaticComplexityCalculatingVisitor.php
        Calculator.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    diff/
      src/
        Exception/
          ConfigurationException.php
          Exception.php
          InvalidArgumentException.php
        Output/
          AbstractChunkOutputBuilder.php
          DiffOnlyOutputBuilder.php
          DiffOutputBuilderInterface.php
          StrictUnifiedDiffOutputBuilder.php
          UnifiedDiffOutputBuilder.php
        Chunk.php
        Diff.php
        Differ.php
        Line.php
        LongestCommonSubsequenceCalculator.php
        MemoryEfficientLongestCommonSubsequenceCalculator.php
        Parser.php
        TimeEfficientLongestCommonSubsequenceCalculator.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    environment/
      src/
        Console.php
        Runtime.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    exporter/
      src/
        Exporter.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    global-state/
      src/
        exceptions/
          Exception.php
          RuntimeException.php
        CodeExporter.php
        ExcludeList.php
        Restorer.php
        Snapshot.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    lines-of-code/
      src/
        Exception/
          Exception.php
          IllogicalValuesException.php
          NegativeValueException.php
          RuntimeException.php
        Counter.php
        LineCountingVisitor.php
        LinesOfCode.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    object-enumerator/
      src/
        Enumerator.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    object-reflector/
      src/
        ObjectReflector.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    recursion-context/
      src/
        Context.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    type/
      src/
        exception/
          Exception.php
          RuntimeException.php
        type/
          CallableType.php
          FalseType.php
          GenericObjectType.php
          IntersectionType.php
          IterableType.php
          MixedType.php
          NeverType.php
          NullType.php
          ObjectType.php
          SimpleType.php
          StaticType.php
          TrueType.php
          Type.php
          UnionType.php
          UnknownType.php
          VoidType.php
        Parameter.php
        ReflectionMapper.php
        TypeName.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
    version/
      src/
        Version.php
      ChangeLog.md
      composer.json
      LICENSE
      README.md
      SECURITY.md
  staabm/
    side-effects-detector/
      lib/
        functionMetadata.php
        SideEffect.php
        SideEffectsDetector.php
      composer.json
      LICENSE
      README.md
  symfony/
    clock/
      Resources/
        now.php
      Test/
        ClockSensitiveTrait.php
      CHANGELOG.md
      Clock.php
      ClockAwareTrait.php
      ClockInterface.php
      composer.json
      DatePoint.php
      LICENSE
      MockClock.php
      MonotonicClock.php
      NativeClock.php
      README.md
    console/
      Attribute/
        Argument.php
        AsCommand.php
        Option.php
      CI/
        GithubActionReporter.php
      Command/
        Command.php
        CompleteCommand.php
        DumpCompletionCommand.php
        HelpCommand.php
        InvokableCommand.php
        LazyCommand.php
        ListCommand.php
        LockableTrait.php
        SignalableCommandInterface.php
        TraceableCommand.php
      CommandLoader/
        CommandLoaderInterface.php
        ContainerCommandLoader.php
        FactoryCommandLoader.php
      Completion/
        Output/
          BashCompletionOutput.php
          CompletionOutputInterface.php
          FishCompletionOutput.php
          ZshCompletionOutput.php
        CompletionInput.php
        CompletionSuggestions.php
        Suggestion.php
      DataCollector/
        CommandDataCollector.php
      Debug/
        CliRequest.php
      DependencyInjection/
        AddConsoleCommandPass.php
      Descriptor/
        ApplicationDescription.php
        Descriptor.php
        DescriptorInterface.php
        JsonDescriptor.php
        MarkdownDescriptor.php
        ReStructuredTextDescriptor.php
        TextDescriptor.php
        XmlDescriptor.php
      Event/
        ConsoleAlarmEvent.php
        ConsoleCommandEvent.php
        ConsoleErrorEvent.php
        ConsoleEvent.php
        ConsoleSignalEvent.php
        ConsoleTerminateEvent.php
      EventListener/
        ErrorListener.php
      Exception/
        CommandNotFoundException.php
        ExceptionInterface.php
        InvalidArgumentException.php
        InvalidOptionException.php
        LogicException.php
        MissingInputException.php
        NamespaceNotFoundException.php
        RunCommandFailedException.php
        RuntimeException.php
      Formatter/
        NullOutputFormatter.php
        NullOutputFormatterStyle.php
        OutputFormatter.php
        OutputFormatterInterface.php
        OutputFormatterStyle.php
        OutputFormatterStyleInterface.php
        OutputFormatterStyleStack.php
        WrappableOutputFormatterInterface.php
      Helper/
        DebugFormatterHelper.php
        DescriptorHelper.php
        Dumper.php
        FormatterHelper.php
        Helper.php
        HelperInterface.php
        HelperSet.php
        InputAwareHelper.php
        OutputWrapper.php
        ProcessHelper.php
        ProgressBar.php
        ProgressIndicator.php
        QuestionHelper.php
        SymfonyQuestionHelper.php
        Table.php
        TableCell.php
        TableCellStyle.php
        TableRows.php
        TableSeparator.php
        TableStyle.php
        TreeHelper.php
        TreeNode.php
        TreeStyle.php
      Input/
        ArgvInput.php
        ArrayInput.php
        Input.php
        InputArgument.php
        InputAwareInterface.php
        InputDefinition.php
        InputInterface.php
        InputOption.php
        StreamableInputInterface.php
        StringInput.php
      Logger/
        ConsoleLogger.php
      Messenger/
        RunCommandContext.php
        RunCommandMessage.php
        RunCommandMessageHandler.php
      Output/
        AnsiColorMode.php
        BufferedOutput.php
        ConsoleOutput.php
        ConsoleOutputInterface.php
        ConsoleSectionOutput.php
        NullOutput.php
        Output.php
        OutputInterface.php
        StreamOutput.php
        TrimmedBufferOutput.php
      Question/
        ChoiceQuestion.php
        ConfirmationQuestion.php
        Question.php
      Resources/
        bin/
          hiddeninput.exe
        completion.bash
        completion.fish
        completion.zsh
      SignalRegistry/
        SignalMap.php
        SignalRegistry.php
      Style/
        OutputStyle.php
        StyleInterface.php
        SymfonyStyle.php
      Tester/
        Constraint/
          CommandIsSuccessful.php
        ApplicationTester.php
        CommandCompletionTester.php
        CommandTester.php
        TesterTrait.php
      Application.php
      CHANGELOG.md
      Color.php
      composer.json
      ConsoleEvents.php
      Cursor.php
      LICENSE
      README.md
      SingleCommandApplication.php
      Terminal.php
    css-selector/
      Exception/
        ExceptionInterface.php
        ExpressionErrorException.php
        InternalErrorException.php
        ParseException.php
        SyntaxErrorException.php
      Node/
        AbstractNode.php
        AttributeNode.php
        ClassNode.php
        CombinedSelectorNode.php
        ElementNode.php
        FunctionNode.php
        HashNode.php
        MatchingNode.php
        NegationNode.php
        NodeInterface.php
        PseudoNode.php
        SelectorNode.php
        Specificity.php
        SpecificityAdjustmentNode.php
      Parser/
        Handler/
          CommentHandler.php
          HandlerInterface.php
          HashHandler.php
          IdentifierHandler.php
          NumberHandler.php
          StringHandler.php
          WhitespaceHandler.php
        Shortcut/
          ClassParser.php
          ElementParser.php
          EmptyStringParser.php
          HashParser.php
        Tokenizer/
          Tokenizer.php
          TokenizerEscaping.php
          TokenizerPatterns.php
        Parser.php
        ParserInterface.php
        Reader.php
        Token.php
        TokenStream.php
      XPath/
        Extension/
          AbstractExtension.php
          AttributeMatchingExtension.php
          CombinationExtension.php
          ExtensionInterface.php
          FunctionExtension.php
          HtmlExtension.php
          NodeExtension.php
          PseudoClassExtension.php
        Translator.php
        TranslatorInterface.php
        XPathExpr.php
      CHANGELOG.md
      composer.json
      CssSelectorConverter.php
      LICENSE
      README.md
    deprecation-contracts/
      CHANGELOG.md
      composer.json
      function.php
      LICENSE
      README.md
    error-handler/
      Command/
        ErrorDumpCommand.php
      Error/
        ClassNotFoundError.php
        FatalError.php
        OutOfMemoryError.php
        UndefinedFunctionError.php
        UndefinedMethodError.php
      ErrorEnhancer/
        ClassNotFoundErrorEnhancer.php
        ErrorEnhancerInterface.php
        UndefinedFunctionErrorEnhancer.php
        UndefinedMethodErrorEnhancer.php
      ErrorRenderer/
        CliErrorRenderer.php
        ErrorRendererInterface.php
        FileLinkFormatter.php
        HtmlErrorRenderer.php
        SerializerErrorRenderer.php
      Exception/
        FlattenException.php
        SilencedErrorContext.php
      Internal/
        TentativeTypes.php
      Resources/
        assets/
          css/
            error.css
            exception_full.css
            exception.css
          images/
            chevron-right.svg
            favicon.png.base64
            icon-book.svg
            icon-copy.svg
            icon-minus-square-o.svg
            icon-minus-square.svg
            icon-plus-square-o.svg
            icon-plus-square.svg
            icon-support.svg
            symfony-ghost.svg.php
            symfony-logo.svg
          js/
            exception.js
        bin/
          extract-tentative-return-types.php
          patch-type-declarations
        views/
          error.html.php
          exception_full.html.php
          exception.html.php
          logs.html.php
          trace.html.php
          traces_text.html.php
          traces.html.php
      BufferingLogger.php
      CHANGELOG.md
      composer.json
      Debug.php
      DebugClassLoader.php
      ErrorHandler.php
      LICENSE
      README.md
      ThrowableUtils.php
    event-dispatcher/
      Attribute/
        AsEventListener.php
      Debug/
        TraceableEventDispatcher.php
        WrappedListener.php
      DependencyInjection/
        AddEventAliasesPass.php
        RegisterListenersPass.php
      CHANGELOG.md
      composer.json
      EventDispatcher.php
      EventDispatcherInterface.php
      EventSubscriberInterface.php
      GenericEvent.php
      ImmutableEventDispatcher.php
      LICENSE
      README.md
    event-dispatcher-contracts/
      CHANGELOG.md
      composer.json
      Event.php
      EventDispatcherInterface.php
      LICENSE
      README.md
    finder/
      Comparator/
        Comparator.php
        DateComparator.php
        NumberComparator.php
      Exception/
        AccessDeniedException.php
        DirectoryNotFoundException.php
      Iterator/
        CustomFilterIterator.php
        DateRangeFilterIterator.php
        DepthRangeFilterIterator.php
        ExcludeDirectoryFilterIterator.php
        FilecontentFilterIterator.php
        FilenameFilterIterator.php
        FileTypeFilterIterator.php
        LazyIterator.php
        MultiplePcreFilterIterator.php
        PathFilterIterator.php
        RecursiveDirectoryIterator.php
        SizeRangeFilterIterator.php
        SortableIterator.php
        VcsIgnoredFilterIterator.php
      CHANGELOG.md
      composer.json
      Finder.php
      Gitignore.php
      Glob.php
      LICENSE
      README.md
      SplFileInfo.php
    http-foundation/
      Exception/
        BadRequestException.php
        ConflictingHeadersException.php
        ExceptionInterface.php
        ExpiredSignedUriException.php
        JsonException.php
        LogicException.php
        RequestExceptionInterface.php
        SessionNotFoundException.php
        SignedUriException.php
        SuspiciousOperationException.php
        UnexpectedValueException.php
        UnsignedUriException.php
        UnverifiedSignedUriException.php
      File/
        Exception/
          AccessDeniedException.php
          CannotWriteFileException.php
          ExtensionFileException.php
          FileException.php
          FileNotFoundException.php
          FormSizeFileException.php
          IniSizeFileException.php
          NoFileException.php
          NoTmpDirFileException.php
          PartialFileException.php
          UnexpectedTypeException.php
          UploadException.php
        File.php
        Stream.php
        UploadedFile.php
      RateLimiter/
        AbstractRequestRateLimiter.php
        PeekableRequestRateLimiterInterface.php
        RequestRateLimiterInterface.php
      RequestMatcher/
        AttributesRequestMatcher.php
        ExpressionRequestMatcher.php
        HeaderRequestMatcher.php
        HostRequestMatcher.php
        IpsRequestMatcher.php
        IsJsonRequestMatcher.php
        MethodRequestMatcher.php
        PathRequestMatcher.php
        PortRequestMatcher.php
        QueryParameterRequestMatcher.php
        SchemeRequestMatcher.php
      Session/
        Attribute/
          AttributeBag.php
          AttributeBagInterface.php
        Flash/
          AutoExpireFlashBag.php
          FlashBag.php
          FlashBagInterface.php
        Storage/
          Handler/
            AbstractSessionHandler.php
            IdentityMarshaller.php
            MarshallingSessionHandler.php
            MemcachedSessionHandler.php
            MigratingSessionHandler.php
            MongoDbSessionHandler.php
            NativeFileSessionHandler.php
            NullSessionHandler.php
            PdoSessionHandler.php
            RedisSessionHandler.php
            SessionHandlerFactory.php
            StrictSessionHandler.php
          Proxy/
            AbstractProxy.php
            SessionHandlerProxy.php
          MetadataBag.php
          MockArraySessionStorage.php
          MockFileSessionStorage.php
          MockFileSessionStorageFactory.php
          NativeSessionStorage.php
          NativeSessionStorageFactory.php
          PhpBridgeSessionStorage.php
          PhpBridgeSessionStorageFactory.php
          SessionStorageFactoryInterface.php
          SessionStorageInterface.php
        FlashBagAwareSessionInterface.php
        Session.php
        SessionBagInterface.php
        SessionBagProxy.php
        SessionFactory.php
        SessionFactoryInterface.php
        SessionInterface.php
        SessionUtils.php
      Test/
        Constraint/
          RequestAttributeValueSame.php
          ResponseCookieValueSame.php
          ResponseFormatSame.php
          ResponseHasCookie.php
          ResponseHasHeader.php
          ResponseHeaderLocationSame.php
          ResponseHeaderSame.php
          ResponseIsRedirected.php
          ResponseIsSuccessful.php
          ResponseIsUnprocessable.php
          ResponseStatusCodeSame.php
      AcceptHeader.php
      AcceptHeaderItem.php
      BinaryFileResponse.php
      ChainRequestMatcher.php
      CHANGELOG.md
      composer.json
      Cookie.php
      EventStreamResponse.php
      FileBag.php
      HeaderBag.php
      HeaderUtils.php
      InputBag.php
      IpUtils.php
      JsonResponse.php
      LICENSE
      ParameterBag.php
      README.md
      RedirectResponse.php
      Request.php
      RequestMatcherInterface.php
      RequestStack.php
      Response.php
      ResponseHeaderBag.php
      ServerBag.php
      ServerEvent.php
      StreamedJsonResponse.php
      StreamedResponse.php
      UriSigner.php
      UrlHelper.php
    http-kernel/
      Attribute/
        AsController.php
        AsTargetedValueResolver.php
        Cache.php
        MapDateTime.php
        MapQueryParameter.php
        MapQueryString.php
        MapRequestPayload.php
        MapUploadedFile.php
        ValueResolver.php
        WithHttpStatus.php
        WithLogLevel.php
      Bundle/
        AbstractBundle.php
        Bundle.php
        BundleExtension.php
        BundleInterface.php
      CacheClearer/
        CacheClearerInterface.php
        ChainCacheClearer.php
        Psr6CacheClearer.php
      CacheWarmer/
        CacheWarmer.php
        CacheWarmerAggregate.php
        CacheWarmerInterface.php
        WarmableInterface.php
      Config/
        FileLocator.php
      Controller/
        ArgumentResolver/
          BackedEnumValueResolver.php
          DateTimeValueResolver.php
          DefaultValueResolver.php
          NotTaggedControllerValueResolver.php
          QueryParameterValueResolver.php
          RequestAttributeValueResolver.php
          RequestPayloadValueResolver.php
          RequestValueResolver.php
          ServiceValueResolver.php
          SessionValueResolver.php
          TraceableValueResolver.php
          UidValueResolver.php
          VariadicValueResolver.php
        ArgumentResolver.php
        ArgumentResolverInterface.php
        ContainerControllerResolver.php
        ControllerReference.php
        ControllerResolver.php
        ControllerResolverInterface.php
        ErrorController.php
        TraceableArgumentResolver.php
        TraceableControllerResolver.php
        ValueResolverInterface.php
      ControllerMetadata/
        ArgumentMetadata.php
        ArgumentMetadataFactory.php
        ArgumentMetadataFactoryInterface.php
      DataCollector/
        AjaxDataCollector.php
        ConfigDataCollector.php
        DataCollector.php
        DataCollectorInterface.php
        DumpDataCollector.php
        EventDataCollector.php
        ExceptionDataCollector.php
        LateDataCollectorInterface.php
        LoggerDataCollector.php
        MemoryDataCollector.php
        RequestDataCollector.php
        RouterDataCollector.php
        TimeDataCollector.php
      Debug/
        ErrorHandlerConfigurator.php
        TraceableEventDispatcher.php
        VirtualRequestStack.php
      DependencyInjection/
        AddAnnotatedClassesToCachePass.php
        ConfigurableExtension.php
        ControllerArgumentValueResolverPass.php
        Extension.php
        FragmentRendererPass.php
        LazyLoadingFragmentHandler.php
        LoggerPass.php
        MergeExtensionConfigurationPass.php
        RegisterControllerArgumentLocatorsPass.php
        RegisterLocaleAwareServicesPass.php
        RemoveEmptyControllerArgumentLocatorsPass.php
        ResettableServicePass.php
        ServicesResetter.php
        ServicesResetterInterface.php
      Event/
        ControllerArgumentsEvent.php
        ControllerEvent.php
        ExceptionEvent.php
        FinishRequestEvent.php
        KernelEvent.php
        RequestEvent.php
        ResponseEvent.php
        TerminateEvent.php
        ViewEvent.php
      EventListener/
        AbstractSessionListener.php
        AddRequestFormatsListener.php
        CacheAttributeListener.php
        DebugHandlersListener.php
        DisallowRobotsIndexingListener.php
        DumpListener.php
        ErrorListener.php
        FragmentListener.php
        LocaleAwareListener.php
        LocaleListener.php
        ProfilerListener.php
        ResponseListener.php
        RouterListener.php
        SessionListener.php
        SurrogateListener.php
        ValidateRequestListener.php
      Exception/
        AccessDeniedHttpException.php
        BadRequestHttpException.php
        ConflictHttpException.php
        ControllerDoesNotReturnResponseException.php
        GoneHttpException.php
        HttpException.php
        HttpExceptionInterface.php
        InvalidMetadataException.php
        LengthRequiredHttpException.php
        LockedHttpException.php
        MethodNotAllowedHttpException.php
        NearMissValueResolverException.php
        NotAcceptableHttpException.php
        NotFoundHttpException.php
        PreconditionFailedHttpException.php
        PreconditionRequiredHttpException.php
        ResolverNotFoundException.php
        ServiceUnavailableHttpException.php
        TooManyRequestsHttpException.php
        UnauthorizedHttpException.php
        UnexpectedSessionUsageException.php
        UnprocessableEntityHttpException.php
        UnsupportedMediaTypeHttpException.php
      Fragment/
        AbstractSurrogateFragmentRenderer.php
        EsiFragmentRenderer.php
        FragmentHandler.php
        FragmentRendererInterface.php
        FragmentUriGenerator.php
        FragmentUriGeneratorInterface.php
        HIncludeFragmentRenderer.php
        InlineFragmentRenderer.php
        RoutableFragmentRenderer.php
        SsiFragmentRenderer.php
      HttpCache/
        AbstractSurrogate.php
        CacheWasLockedException.php
        Esi.php
        HttpCache.php
        ResponseCacheStrategy.php
        ResponseCacheStrategyInterface.php
        Ssi.php
        Store.php
        StoreInterface.php
        SubRequestHandler.php
        SurrogateInterface.php
      Log/
        DebugLoggerConfigurator.php
        DebugLoggerInterface.php
        Logger.php
      Profiler/
        FileProfilerStorage.php
        Profile.php
        Profiler.php
        ProfilerStateChecker.php
        ProfilerStorageInterface.php
      Resources/
        welcome.html.php
      CHANGELOG.md
      composer.json
      HttpClientKernel.php
      HttpKernel.php
      HttpKernelBrowser.php
      HttpKernelInterface.php
      Kernel.php
      KernelEvents.php
      KernelInterface.php
      LICENSE
      README.md
      RebootableInterface.php
      TerminableInterface.php
    mailer/
      Command/
        MailerTestCommand.php
      DataCollector/
        MessageDataCollector.php
      Event/
        FailedMessageEvent.php
        MessageEvent.php
        MessageEvents.php
        SentMessageEvent.php
      EventListener/
        DkimSignedMessageListener.php
        EnvelopeListener.php
        MessageListener.php
        MessageLoggerListener.php
        MessengerTransportListener.php
        SmimeCertificateRepositoryInterface.php
        SmimeEncryptedMessageListener.php
        SmimeSignedMessageListener.php
      Exception/
        ExceptionInterface.php
        HttpTransportException.php
        IncompleteDsnException.php
        InvalidArgumentException.php
        LogicException.php
        RuntimeException.php
        TransportException.php
        TransportExceptionInterface.php
        UnexpectedResponseException.php
        UnsupportedSchemeException.php
      Header/
        MetadataHeader.php
        TagHeader.php
      Messenger/
        MessageHandler.php
        SendEmailMessage.php
      Test/
        Constraint/
          EmailCount.php
          EmailIsQueued.php
        AbstractTransportFactoryTestCase.php
        IncompleteDsnTestTrait.php
        TransportFactoryTestCase.php
      Transport/
        Smtp/
          Auth/
            AuthenticatorInterface.php
            CramMd5Authenticator.php
            LoginAuthenticator.php
            PlainAuthenticator.php
            XOAuth2Authenticator.php
          Stream/
            AbstractStream.php
            ProcessStream.php
            SocketStream.php
          EsmtpTransport.php
          EsmtpTransportFactory.php
          SmtpTransport.php
        AbstractApiTransport.php
        AbstractHttpTransport.php
        AbstractTransport.php
        AbstractTransportFactory.php
        Dsn.php
        FailoverTransport.php
        NativeTransportFactory.php
        NullTransport.php
        NullTransportFactory.php
        RoundRobinTransport.php
        SendmailTransport.php
        SendmailTransportFactory.php
        TransportFactoryInterface.php
        TransportInterface.php
        Transports.php
      CHANGELOG.md
      composer.json
      DelayedEnvelope.php
      Envelope.php
      LICENSE
      Mailer.php
      MailerInterface.php
      README.md
      SentMessage.php
      Transport.php
    mime/
      Crypto/
        DkimOptions.php
        DkimSigner.php
        SMime.php
        SMimeEncrypter.php
        SMimeSigner.php
      DependencyInjection/
        AddMimeTypeGuesserPass.php
      Encoder/
        AddressEncoderInterface.php
        Base64ContentEncoder.php
        Base64Encoder.php
        Base64MimeHeaderEncoder.php
        ContentEncoderInterface.php
        EightBitContentEncoder.php
        EncoderInterface.php
        IdnAddressEncoder.php
        MimeHeaderEncoderInterface.php
        QpContentEncoder.php
        QpEncoder.php
        QpMimeHeaderEncoder.php
        Rfc2231Encoder.php
      Exception/
        AddressEncoderException.php
        ExceptionInterface.php
        InvalidArgumentException.php
        LogicException.php
        RfcComplianceException.php
        RuntimeException.php
      Header/
        AbstractHeader.php
        DateHeader.php
        HeaderInterface.php
        Headers.php
        IdentificationHeader.php
        MailboxHeader.php
        MailboxListHeader.php
        ParameterizedHeader.php
        PathHeader.php
        UnstructuredHeader.php
      HtmlToTextConverter/
        DefaultHtmlToTextConverter.php
        HtmlToTextConverterInterface.php
        LeagueHtmlToMarkdownConverter.php
      Part/
        Multipart/
          AlternativePart.php
          DigestPart.php
          FormDataPart.php
          MixedPart.php
          RelatedPart.php
        AbstractMultipartPart.php
        AbstractPart.php
        DataPart.php
        File.php
        MessagePart.php
        SMimePart.php
        TextPart.php
      Test/
        Constraint/
          EmailAddressContains.php
          EmailAttachmentCount.php
          EmailHasHeader.php
          EmailHeaderSame.php
          EmailHtmlBodyContains.php
          EmailSubjectContains.php
          EmailTextBodyContains.php
      Address.php
      BodyRendererInterface.php
      CHANGELOG.md
      CharacterStream.php
      composer.json
      DraftEmail.php
      Email.php
      FileBinaryMimeTypeGuesser.php
      FileinfoMimeTypeGuesser.php
      LICENSE
      Message.php
      MessageConverter.php
      MimeTypeGuesserInterface.php
      MimeTypes.php
      MimeTypesInterface.php
      RawMessage.php
      README.md
    polyfill-ctype/
      bootstrap.php
      bootstrap80.php
      composer.json
      Ctype.php
      LICENSE
      README.md
    polyfill-intl-grapheme/
      bootstrap.php
      bootstrap80.php
      composer.json
      Grapheme.php
      LICENSE
      README.md
    polyfill-intl-idn/
      Resources/
        unidata/
          deviation.php
          disallowed_STD3_mapped.php
          disallowed_STD3_valid.php
          disallowed.php
          DisallowedRanges.php
          ignored.php
          mapped.php
          Regex.php
          virama.php
      bootstrap.php
      bootstrap80.php
      composer.json
      Idn.php
      Info.php
      LICENSE
      README.md
    polyfill-intl-normalizer/
      Resources/
        stubs/
          Normalizer.php
        unidata/
          canonicalComposition.php
          canonicalDecomposition.php
          combiningClass.php
          compatibilityDecomposition.php
      bootstrap.php
      bootstrap80.php
      composer.json
      LICENSE
      Normalizer.php
      README.md
    polyfill-mbstring/
      Resources/
        unidata/
          caseFolding.php
          lowerCase.php
          titleCaseRegexp.php
          upperCase.php
      bootstrap.php
      bootstrap80.php
      composer.json
      LICENSE
      Mbstring.php
      README.md
    polyfill-php80/
      Resources/
        stubs/
          Attribute.php
          PhpToken.php
          Stringable.php
          UnhandledMatchError.php
          ValueError.php
      bootstrap.php
      composer.json
      LICENSE
      Php80.php
      PhpToken.php
      README.md
    polyfill-php83/
      Resources/
        stubs/
          DateError.php
          DateException.php
          DateInvalidOperationException.php
          DateInvalidTimeZoneException.php
          DateMalformedIntervalStringException.php
          DateMalformedPeriodStringException.php
          DateMalformedStringException.php
          DateObjectError.php
          DateRangeError.php
          Override.php
          SQLite3Exception.php
      bootstrap.php
      bootstrap81.php
      composer.json
      LICENSE
      Php83.php
      README.md
    polyfill-php84/
      Resources/
        stubs/
          Deprecated.php
          ReflectionConstant.php
      bootstrap.php
      bootstrap82.php
      composer.json
      LICENSE
      Php84.php
      README.md
    polyfill-php85/
      Resources/
        stubs/
          NoDiscard.php
      bootstrap.php
      composer.json
      LICENSE
      Php85.php
      README.md
    polyfill-uuid/
      bootstrap.php
      bootstrap80.php
      composer.json
      LICENSE
      README.md
      Uuid.php
    process/
      Exception/
        ExceptionInterface.php
        InvalidArgumentException.php
        LogicException.php
        ProcessFailedException.php
        ProcessSignaledException.php
        ProcessStartFailedException.php
        ProcessTimedOutException.php
        RunProcessFailedException.php
        RuntimeException.php
      Messenger/
        RunProcessContext.php
        RunProcessMessage.php
        RunProcessMessageHandler.php
      Pipes/
        AbstractPipes.php
        PipesInterface.php
        UnixPipes.php
        WindowsPipes.php
      CHANGELOG.md
      composer.json
      ExecutableFinder.php
      InputStream.php
      LICENSE
      PhpExecutableFinder.php
      PhpProcess.php
      PhpSubprocess.php
      Process.php
      ProcessUtils.php
      README.md
    routing/
      Annotation/
        Route.php
      Attribute/
        DeprecatedAlias.php
        Route.php
      DependencyInjection/
        AddExpressionLanguageProvidersPass.php
        RoutingResolverPass.php
      Exception/
        ExceptionInterface.php
        InvalidArgumentException.php
        InvalidParameterException.php
        LogicException.php
        MethodNotAllowedException.php
        MissingMandatoryParametersException.php
        NoConfigurationException.php
        ResourceNotFoundException.php
        RouteCircularReferenceException.php
        RouteNotFoundException.php
        RuntimeException.php
      Generator/
        Dumper/
          CompiledUrlGeneratorDumper.php
          GeneratorDumper.php
          GeneratorDumperInterface.php
        CompiledUrlGenerator.php
        ConfigurableRequirementsInterface.php
        UrlGenerator.php
        UrlGeneratorInterface.php
      Loader/
        Configurator/
          Traits/
            AddTrait.php
            HostTrait.php
            LocalizedRouteTrait.php
            PrefixTrait.php
            RouteTrait.php
          AliasConfigurator.php
          CollectionConfigurator.php
          ImportConfigurator.php
          RouteConfigurator.php
          RoutingConfigurator.php
        schema/
          routing/
            routing-1.0.xsd
        AttributeClassLoader.php
        AttributeDirectoryLoader.php
        AttributeFileLoader.php
        ClosureLoader.php
        ContainerLoader.php
        DirectoryLoader.php
        GlobFileLoader.php
        ObjectLoader.php
        PhpFileLoader.php
        Psr4DirectoryLoader.php
        XmlFileLoader.php
        YamlFileLoader.php
      Matcher/
        Dumper/
          CompiledUrlMatcherDumper.php
          CompiledUrlMatcherTrait.php
          MatcherDumper.php
          MatcherDumperInterface.php
          StaticPrefixCollection.php
        CompiledUrlMatcher.php
        ExpressionLanguageProvider.php
        RedirectableUrlMatcher.php
        RedirectableUrlMatcherInterface.php
        RequestMatcherInterface.php
        TraceableUrlMatcher.php
        UrlMatcher.php
        UrlMatcherInterface.php
      Requirement/
        EnumRequirement.php
        Requirement.php
      Alias.php
      CHANGELOG.md
      CompiledRoute.php
      composer.json
      LICENSE
      README.md
      RequestContext.php
      RequestContextAwareInterface.php
      Route.php
      RouteCollection.php
      RouteCompiler.php
      RouteCompilerInterface.php
      Router.php
      RouterInterface.php
    service-contracts/
      Attribute/
        Required.php
        SubscribedService.php
      Test/
        ServiceLocatorTest.php
        ServiceLocatorTestCase.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
      ResetInterface.php
      ServiceCollectionInterface.php
      ServiceLocatorTrait.php
      ServiceMethodsSubscriberTrait.php
      ServiceProviderInterface.php
      ServiceSubscriberInterface.php
      ServiceSubscriberTrait.php
    string/
      Exception/
        ExceptionInterface.php
        InvalidArgumentException.php
        RuntimeException.php
      Inflector/
        EnglishInflector.php
        FrenchInflector.php
        InflectorInterface.php
        SpanishInflector.php
      Resources/
        data/
          wcswidth_table_wide.php
          wcswidth_table_zero.php
        functions.php
      Slugger/
        AsciiSlugger.php
        SluggerInterface.php
      AbstractString.php
      AbstractUnicodeString.php
      ByteString.php
      CHANGELOG.md
      CodePointString.php
      composer.json
      LazyString.php
      LICENSE
      README.md
      TruncateMode.php
      UnicodeString.php
    translation/
      Catalogue/
        AbstractOperation.php
        MergeOperation.php
        OperationInterface.php
        TargetOperation.php
      Command/
        TranslationLintCommand.php
        TranslationPullCommand.php
        TranslationPushCommand.php
        TranslationTrait.php
        XliffLintCommand.php
      DataCollector/
        TranslationDataCollector.php
      DependencyInjection/
        DataCollectorTranslatorPass.php
        LoggingTranslatorPass.php
        TranslationDumperPass.php
        TranslationExtractorPass.php
        TranslatorPass.php
        TranslatorPathsPass.php
      Dumper/
        CsvFileDumper.php
        DumperInterface.php
        FileDumper.php
        IcuResFileDumper.php
        IniFileDumper.php
        JsonFileDumper.php
        MoFileDumper.php
        PhpFileDumper.php
        PoFileDumper.php
        QtFileDumper.php
        XliffFileDumper.php
        YamlFileDumper.php
      Exception/
        ExceptionInterface.php
        IncompleteDsnException.php
        InvalidArgumentException.php
        InvalidResourceException.php
        LogicException.php
        MissingRequiredOptionException.php
        NotFoundResourceException.php
        ProviderException.php
        ProviderExceptionInterface.php
        RuntimeException.php
        UnsupportedSchemeException.php
      Extractor/
        Visitor/
          AbstractVisitor.php
          ConstraintVisitor.php
          TranslatableMessageVisitor.php
          TransMethodVisitor.php
        AbstractFileExtractor.php
        ChainExtractor.php
        ExtractorInterface.php
        PhpAstExtractor.php
      Formatter/
        IntlFormatter.php
        IntlFormatterInterface.php
        MessageFormatter.php
        MessageFormatterInterface.php
      Loader/
        ArrayLoader.php
        CsvFileLoader.php
        FileLoader.php
        IcuDatFileLoader.php
        IcuResFileLoader.php
        IniFileLoader.php
        JsonFileLoader.php
        LoaderInterface.php
        MoFileLoader.php
        PhpFileLoader.php
        PoFileLoader.php
        QtFileLoader.php
        XliffFileLoader.php
        YamlFileLoader.php
      Provider/
        AbstractProviderFactory.php
        Dsn.php
        FilteringProvider.php
        NullProvider.php
        NullProviderFactory.php
        ProviderFactoryInterface.php
        ProviderInterface.php
        TranslationProviderCollection.php
        TranslationProviderCollectionFactory.php
      Reader/
        TranslationReader.php
        TranslationReaderInterface.php
      Resources/
        bin/
          translation-status.php
        data/
          parents.json
        schemas/
          xliff-core-1.2-transitional.xsd
          xliff-core-2.0.xsd
          xml.xsd
        functions.php
      Test/
        AbstractProviderFactoryTestCase.php
        IncompleteDsnTestTrait.php
        ProviderFactoryTestCase.php
        ProviderTestCase.php
      Util/
        ArrayConverter.php
        XliffUtils.php
      Writer/
        TranslationWriter.php
        TranslationWriterInterface.php
      CatalogueMetadataAwareInterface.php
      CHANGELOG.md
      composer.json
      DataCollectorTranslator.php
      IdentityTranslator.php
      LICENSE
      LocaleSwitcher.php
      LoggingTranslator.php
      MessageCatalogue.php
      MessageCatalogueInterface.php
      MetadataAwareInterface.php
      PseudoLocalizationTranslator.php
      README.md
      TranslatableMessage.php
      Translator.php
      TranslatorBag.php
      TranslatorBagInterface.php
    translation-contracts/
      Test/
        TranslatorTest.php
      CHANGELOG.md
      composer.json
      LICENSE
      LocaleAwareInterface.php
      README.md
      TranslatableInterface.php
      TranslatorInterface.php
      TranslatorTrait.php
    uid/
      Command/
        GenerateUlidCommand.php
        GenerateUuidCommand.php
        InspectUlidCommand.php
        InspectUuidCommand.php
      Exception/
        InvalidArgumentException.php
        LogicException.php
      Factory/
        NameBasedUuidFactory.php
        RandomBasedUuidFactory.php
        TimeBasedUuidFactory.php
        UlidFactory.php
        UuidFactory.php
      AbstractUid.php
      BinaryUtil.php
      CHANGELOG.md
      composer.json
      HashableInterface.php
      LICENSE
      MaxUlid.php
      MaxUuid.php
      NilUlid.php
      NilUuid.php
      README.md
      TimeBasedUidInterface.php
      Ulid.php
      Uuid.php
      UuidV1.php
      UuidV3.php
      UuidV4.php
      UuidV5.php
      UuidV6.php
      UuidV7.php
      UuidV8.php
    var-dumper/
      Caster/
        AddressInfoCaster.php
        AmqpCaster.php
        ArgsStub.php
        Caster.php
        ClassStub.php
        ConstStub.php
        CurlCaster.php
        CutArrayStub.php
        CutStub.php
        DateCaster.php
        DoctrineCaster.php
        DOMCaster.php
        DsCaster.php
        DsPairStub.php
        EnumStub.php
        ExceptionCaster.php
        FFICaster.php
        FiberCaster.php
        FrameStub.php
        GdCaster.php
        GmpCaster.php
        ImagineCaster.php
        ImgStub.php
        IntlCaster.php
        LinkStub.php
        MemcachedCaster.php
        MysqliCaster.php
        OpenSSLCaster.php
        PdoCaster.php
        PgSqlCaster.php
        ProxyManagerCaster.php
        RdKafkaCaster.php
        RedisCaster.php
        ReflectionCaster.php
        ResourceCaster.php
        ScalarStub.php
        SocketCaster.php
        SplCaster.php
        SqliteCaster.php
        StubCaster.php
        SymfonyCaster.php
        TraceStub.php
        UninitializedStub.php
        UuidCaster.php
        VirtualStub.php
        XmlReaderCaster.php
        XmlResourceCaster.php
      Cloner/
        Internal/
          NoDefault.php
        AbstractCloner.php
        ClonerInterface.php
        Cursor.php
        Data.php
        DumperInterface.php
        Stub.php
        VarCloner.php
      Command/
        Descriptor/
          CliDescriptor.php
          DumpDescriptorInterface.php
          HtmlDescriptor.php
        ServerDumpCommand.php
      Dumper/
        ContextProvider/
          CliContextProvider.php
          ContextProviderInterface.php
          RequestContextProvider.php
          SourceContextProvider.php
        AbstractDumper.php
        CliDumper.php
        ContextualizedDumper.php
        DataDumperInterface.php
        HtmlDumper.php
        ServerDumper.php
      Exception/
        ThrowingCasterException.php
      Resources/
        bin/
          var-dump-server
        css/
          htmlDescriptor.css
        functions/
          dump.php
        js/
          htmlDescriptor.js
      Server/
        Connection.php
        DumpServer.php
      Test/
        VarDumperTestTrait.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
      VarDumper.php
    yaml/
      Command/
        LintCommand.php
      Exception/
        DumpException.php
        ExceptionInterface.php
        ParseException.php
        RuntimeException.php
      Resources/
        bin/
          yaml-lint
      Tag/
        TaggedValue.php
      CHANGELOG.md
      composer.json
      Dumper.php
      Escaper.php
      Inline.php
      LICENSE
      Parser.php
      README.md
      Unescaper.php
      Yaml.php
  theseer/
    tokenizer/
      src/
        Exception.php
        NamespaceUri.php
        NamespaceUriException.php
        Token.php
        TokenCollection.php
        TokenCollectionException.php
        Tokenizer.php
        XMLSerializer.php
      CHANGELOG.md
      composer.json
      composer.lock
      LICENSE
      README.md
  tijsverkoyen/
    css-to-inline-styles/
      src/
        Css/
          Property/
            Processor.php
            Property.php
          Rule/
            Processor.php
            Rule.php
          Processor.php
        CssToInlineStyles.php
      composer.json
      LICENSE.md
  vlucas/
    phpdotenv/
      src/
        Exception/
          ExceptionInterface.php
          InvalidEncodingException.php
          InvalidFileException.php
          InvalidPathException.php
          ValidationException.php
        Loader/
          Loader.php
          LoaderInterface.php
          Resolver.php
        Parser/
          Entry.php
          EntryParser.php
          Lexer.php
          Lines.php
          Parser.php
          ParserInterface.php
          Value.php
        Repository/
          Adapter/
            AdapterInterface.php
            ApacheAdapter.php
            ArrayAdapter.php
            EnvConstAdapter.php
            GuardedWriter.php
            ImmutableWriter.php
            MultiReader.php
            MultiWriter.php
            PutenvAdapter.php
            ReaderInterface.php
            ReplacingWriter.php
            ServerConstAdapter.php
            WriterInterface.php
          AdapterRepository.php
          RepositoryBuilder.php
          RepositoryInterface.php
        Store/
          File/
            Paths.php
            Reader.php
          FileStore.php
          StoreBuilder.php
          StoreInterface.php
          StringStore.php
        Util/
          Regex.php
          Str.php
        Dotenv.php
        Validator.php
      composer.json
      LICENSE
  voku/
    portable-ascii/
      src/
        voku/
          helper/
            data/
              ascii_by_languages.php
              ascii_extras_by_languages.php
              ascii_language_max_key.php
              ascii_ord.php
              x000.php
              x00a.php
              x0a0.php
              x0a1.php
              x0a2.php
              x0a3.php
              x0a4.php
              x0ac.php
              x0ad.php
              x0ae.php
              x0af.php
              x00b.php
              x0b0.php
              x0b1.php
              x0b2.php
              x0b3.php
              x0b4.php
              x0b5.php
              x0b6.php
              x0b7.php
              x0b8.php
              x0b9.php
              x0ba.php
              x0bb.php
              x0bc.php
              x0bd.php
              x0be.php
              x0bf.php
              x00c.php
              x0c0.php
              x0c1.php
              x0c2.php
              x0c3.php
              x0c4.php
              x0c5.php
              x0c6.php
              x0c7.php
              x0c8.php
              x0c9.php
              x0ca.php
              x0cb.php
              x0cc.php
              x0cd.php
              x0ce.php
              x0cf.php
              x00d.php
              x0d0.php
              x0d1.php
              x0d2.php
              x0d3.php
              x0d4.php
              x0d5.php
              x0d6.php
              x0d7.php
              x00e.php
              x00f.php
              x0f9.php
              x0fa.php
              x0fb.php
              x0fc.php
              x0fd.php
              x0fe.php
              x0ff.php
              x001.php
              x01d.php
              x1d4.php
              x1d5.php
              x1d6.php
              x1d7.php
              x01e.php
              x01f.php
              x1f1.php
              x002.php
              x02a.php
              x02c.php
              x02e.php
              x02f.php
              x003.php
              x004.php
              x04d.php
              x04e.php
              x04f.php
              x005.php
              x05a.php
              x05b.php
              x05c.php
              x05d.php
              x05e.php
              x05f.php
              x006.php
              x06a.php
              x06b.php
              x06c.php
              x06d.php
              x06e.php
              x06f.php
              x007.php
              x07a.php
              x07b.php
              x07c.php
              x07d.php
              x07e.php
              x07f.php
              x08a.php
              x08b.php
              x08c.php
              x08d.php
              x08e.php
              x08f.php
              x009.php
              x09a.php
              x09b.php
              x09c.php
              x09d.php
              x09e.php
              x09f.php
              x010.php
              x011.php
              x012.php
              x013.php
              x014.php
              x015.php
              x016.php
              x017.php
              x018.php
              x020.php
              x021.php
              x022.php
              x023.php
              x024.php
              x025.php
              x026.php
              x027.php
              x028.php
              x029.php
              x030.php
              x031.php
              x032.php
              x033.php
              x050.php
              x051.php
              x052.php
              x053.php
              x054.php
              x055.php
              x056.php
              x057.php
              x058.php
              x059.php
              x060.php
              x061.php
              x062.php
              x063.php
              x064.php
              x065.php
              x066.php
              x067.php
              x068.php
              x069.php
              x070.php
              x071.php
              x072.php
              x073.php
              x074.php
              x075.php
              x076.php
              x077.php
              x078.php
              x079.php
              x080.php
              x081.php
              x082.php
              x083.php
              x084.php
              x085.php
              x086.php
              x087.php
              x088.php
              x089.php
              x090.php
              x091.php
              x092.php
              x093.php
              x094.php
              x095.php
              x096.php
              x097.php
              x098.php
              x099.php
            ASCII.php
      .deepsource.toml
      CHANGELOG.md
      composer.json
      LICENSE.txt
      README.md
  webmozart/
    assert/
      src/
        Assert.php
        InvalidArgumentException.php
        Mixin.php
      CHANGELOG.md
      composer.json
      LICENSE
      README.md
  autoload.php
.editorconfig
.env
.env.example
.gitattributes
.gitignore
artisan
composer.json
composer.lock
export.md
package-lock.json
package.json
phpunit.xml
README.md
vite.config.js
```



# Selected Files Content

## app/Http/Controllers/Api/LayerController.php

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLayerRequest;
use App\Http\Requests\UpdateLayerRequest;
use App\Models\Layer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LayerController extends Controller
{
    /* -------------------------- Helpers -------------------------- */

    protected function requireSuperAdmin(Request $request): void
    {
        $user = $request->user();
        $role = method_exists($user, 'highestRoleName') ? $user->highestRoleName() : null;
        if ($role !== 'superadmin') {
            abort(403, 'Only Super Administrators may modify layers.');
        }
    }

    // Accepts geometry GeoJSON or a Feature wrapping geometry. (FeatureCollection is not supported in this MVP.)
    protected function extractGeometryJson(string $geojson): string
    {
        $decoded = json_decode($geojson, true);
        if (!$decoded || !is_array($decoded)) {
            abort(422, 'Invalid GeoJSON.');
        }

        // If Feature: take its geometry
        if (($decoded['type'] ?? '') === 'Feature') {
            if (empty($decoded['geometry'])) abort(422, 'GeoJSON Feature has no geometry.');
            $geom = $decoded['geometry'];
        }
        // If geometry object directly
        elseif (isset($decoded['type']) && isset($decoded['coordinates'])) {
            $geom = $decoded;
        }
        // FeatureCollection not handled in MVP (to keep SQL simple).
        elseif (($decoded['type'] ?? '') === 'FeatureCollection') {
            abort(422, 'FeatureCollection not supported yet. Please upload a dissolved Polygon/MultiPolygon GeoJSON.');
        }
        else {
            abort(422, 'Unsupported GeoJSON structure.');
        }

        // Only Polygon / MultiPolygon for main geometries
        $t = strtolower($geom['type'] ?? '');
        if (!in_array($t, ['polygon', 'multipolygon'])) {
            abort(422, 'Only Polygon or MultiPolygon geometries are supported.');
        }

        return json_encode($geom);
    }

    /* -------------------------- Endpoints -------------------------- */

    // GET /api/layers?body_type=lake&body_id=1&include=geom,bounds
    public function index(Request $request)
    {
        $request->validate([
            'body_type' => 'required|string|in:lake,watershed',
            'body_id'   => 'required|integer|min:1',
            'include'   => 'nullable|string'
        ]);

        $include = collect(explode(',', (string) $request->query('include')))
            ->map(fn($s) => trim($s))->filter()->values();

        $query = Layer::query()
            ->leftJoin('users', 'users.id', '=', 'layers.uploaded_by')
            ->where([
                'body_type' => $request->query('body_type'),
                'body_id'   => (int) $request->query('body_id'),
            ])
            ->orderByDesc('is_active')
            ->orderByDesc('created_at');

        // Select base columns
        $query->select('layers.*');
        $query->addSelect(DB::raw("COALESCE(users.name, '') AS uploaded_by_name"));

        // Optionally include GeoJSON (for preview) and bbox as GeoJSON
        if ($include->contains('geom'))   $query->selectRaw('ST_AsGeoJSON(geom)  AS geom_geojson');
        if ($include->contains('bounds')) $query->selectRaw('ST_AsGeoJSON(bbox)  AS bbox_geojson');

        $rows = $query->get();

        return response()->json([
            'data' => $rows,
        ]);
    }

    // GET /api/layers/active?body_type=lake&body_id=1
    public function active(Request $request)
    {
        $request->validate([
            'body_type' => 'required|string|in:lake,watershed',
            'body_id'   => 'required|integer|min:1',
        ]);

        $row = Layer::where('body_type', $request->query('body_type'))
            ->where('body_id', (int) $request->query('body_id'))
            ->where('is_active', true)
            ->select('*')
            ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
            ->first();

        return response()->json(['data' => $row]);
    }

    // POST /api/layers
    public function store(StoreLayerRequest $request)
    {
        $this->requireSuperAdmin($request);

        $data = $request->validated();

        return DB::transaction(function () use ($request, $data) {
            // Create row without geometry first
            $layer = new Layer();
            $layer->fill([
                'body_type'       => $data['body_type'],
                'body_id'         => (int) $data['body_id'],
                'uploaded_by'     => $request->user()->id ?? null,
                'name'            => $data['name'],
                'type'            => $data['type']        ?? 'base',
                'category'        => $data['category']    ?? null,
                'srid'            => (int)($data['srid']  ?? 4326),
                'visibility'      => $data['visibility']  ?? 'admin',
                'is_active'       => (bool)($data['is_active'] ?? false),
                'status'          => $data['status']      ?? 'ready',
                'version'         => (int)($data['version'] ?? 1),
                'notes'           => $data['notes']       ?? null,
                'source_type'     => $data['source_type'] ?? 'geojson',
            ]);
            $layer->save();

            // Geometry: accept GeoJSON geometry or Feature
            $geomJson = $this->extractGeometryJson($data['geom_geojson']);
            $srid     = (int)($data['srid'] ?? 4326);

            DB::update(
                // Set SRID first, then transform when needed. Extract polygons (type=3) and force Multi.
                "UPDATE layers
                   SET geom =
                        CASE
                          WHEN ? = 4326 THEN
                            ST_Multi(
                              ST_CollectionExtract(
                                ST_ForceCollection(
                                  ST_MakeValid(
                                    ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)
                                  )
                                ), 3
                              )
                            )
                          ELSE
                            ST_Transform(
                              ST_Multi(
                                ST_CollectionExtract(
                                  ST_ForceCollection(
                                    ST_MakeValid(
                                      ST_SetSRID(ST_GeomFromGeoJSON(?), ?)
                                    )
                                  ), 3
                                )
                              ),
                              4326
                            )
                        END,
                       srid = 4326,
                       updated_at = now()
                 WHERE id = ?",
                [$srid, $geomJson, $geomJson, $srid, $layer->id]
            );

            // If requested active, deactivate siblings (no DB trigger dependency)
            if ($layer->is_active) {
                Layer::where('body_type', $layer->body_type)
                    ->where('body_id', $layer->body_id)
                    ->where('id', '!=', $layer->id)
                    ->update(['is_active' => false]);
            }

            $fresh = Layer::whereKey($layer->id)
                ->select('*')
                ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
                ->first();

            return response()->json(['data' => $fresh], 201);
        });
    }

    // PATCH /api/layers/{id}
    public function update(UpdateLayerRequest $request, int $id)
    {
        $this->requireSuperAdmin($request);

        $layer = Layer::findOrFail($id);
        $data  = $request->validated();

        // Basic fields
        $layer->fill([
            'name'        => $data['name']        ?? $layer->name,
            'type'        => $data['type']        ?? $layer->type,
            'category'    => $data['category']    ?? $layer->category,
            'visibility'  => $data['visibility']  ?? $layer->visibility,
            'status'      => $data['status']      ?? $layer->status,
            'version'     => isset($data['version']) ? (int)$data['version'] : $layer->version,
            'notes'       => $data['notes']       ?? $layer->notes,
            'is_active'   => isset($data['is_active']) ? (bool)$data['is_active'] : $layer->is_active,
        ]);

        return DB::transaction(function () use ($layer, $data) {
            $activating = array_key_exists('is_active', $data) && (bool)$data['is_active'] === true;
            $layer->save();

            // Optional geometry replacement
            if (!empty($data['geom_geojson'])) {
                $geomJson = $this->extractGeometryJson($data['geom_geojson']);
                $srid     = (int)($data['srid'] ?? $layer->srid ?? 4326);

                DB::update(
                    "UPDATE layers
                        SET geom =
                            CASE
                              WHEN ? = 4326 THEN
                                ST_Multi(
                                  ST_CollectionExtract(
                                    ST_ForceCollection(
                                      ST_MakeValid(
                                        ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)
                                      )
                                    ), 3
                                  )
                                )
                              ELSE
                                ST_Transform(
                                  ST_Multi(
                                    ST_CollectionExtract(
                                      ST_ForceCollection(
                                        ST_MakeValid(
                                          ST_SetSRID(ST_GeomFromGeoJSON(?), ?)
                                        )
                                      ), 3
                                    )
                                  ),
                                  4326
                                )
                            END,
                            srid = 4326,
                            updated_at = now()
                      WHERE id = ?",
                    [$srid, $geomJson, $geomJson, $srid, $layer->id]
                );
            }

            if ($activating) {
                Layer::where('body_type', $layer->body_type)
                    ->where('body_id', $layer->body_id)
                    ->where('id', '!=', $layer->id)
                    ->update(['is_active' => false]);
            }

            $fresh = Layer::whereKey($layer->id)
                ->select('*')
                ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
                ->first();

            return response()->json(['data' => $fresh]);
        });
    }

    // DELETE /api/layers/{id}
    public function destroy(Request $request, int $id)
    {
        $this->requireSuperAdmin($request);

        $layer = Layer::findOrFail($id);
        $layer->delete();

        return response()->json([], 204);
    }
}
```

## app/Http/Controllers/Api/OptionsController.php

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Lake;
use App\Models\Watershed;

class OptionsController extends Controller
{
    /**
     * GET /api/options/lakes?q=&limit=
     * Returns [{ id, name }, ...] for lightweight dropdowns.
     */
    public function lakes(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $limit = (int) $request->query('limit', 500);
        $limit = max(1, min($limit, 2000)); // cap for safety

        $rows = Lake::query()
            ->select(['id', 'name'])
            ->when($q !== '', function ($qb) use ($q) {
                // Postgres: ILIKE for case-insensitive search
                $qb->where('name', 'ILIKE', "%{$q}%");
            })
            ->orderBy('name')
            ->limit($limit)
            ->get();

        return response()->json($rows);
    }

    /**
     * GET /api/options/watersheds?q=&limit=
     * Returns [{ id, name }, ...] for lightweight dropdowns.
     */
    public function watersheds(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $limit = (int) $request->query('limit', 500);
        $limit = max(1, min($limit, 2000));

        $rows = Watershed::query()
            ->select(['id', 'name'])
            ->when($q !== '', function ($qb) use ($q) {
                $qb->where('name', 'ILIKE', "%{$q}%");
            })
            ->orderBy('name')
            ->limit($limit)
            ->get();

        return response()->json($rows);
    }
}
```

## app/Http/Controllers/Api/TenantController.php

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTenantRequest;
use App\Http\Requests\UpdateTenantRequest;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TenantController extends Controller
{
    // List tenants with pagination, search, filter
    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 10);
        $q = $request->input('q');
        $active = $request->input('active'); // '1' or '0' or null
        $includeDeleted = filter_var($request->input('with_deleted'), FILTER_VALIDATE_BOOLEAN);

        $query = Tenant::query();

        if ($includeDeleted) {
            $query = Tenant::withTrashed();
        }

        if (!is_null($active) && $active !== '') {
            $query->where('active', (int) $active);
        }

        if ($q) {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'ilike', "%{$q}%")
                    ->orWhere('domain', 'ilike', "%{$q}%")
                    ->orWhere('contact_email', 'ilike', "%{$q}%");
            });
        }

        $tenants = $query->orderBy('created_at', 'desc')->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $tenants->items(),
            'meta' => [
                'total' => $tenants->total(),
                'per_page' => $tenants->perPage(),
                'current_page' => $tenants->currentPage(),
                'last_page' => $tenants->lastPage(),
            ],
        ]);
    }

    // Store a new tenant
    public function store(StoreTenantRequest $request)
    {
        $payload = $request->only([
            'name', 'domain', 'contact_email', 'phone', 'address', 'metadata', 'active'
        ]);

        $payload['slug'] = Str::slug($payload['name'] ?? time());
        if (!isset($payload['active'])) {
            $payload['active'] = true;
        }

        // ensure slug uniqueness
        $baseSlug = $payload['slug'];
        $i = 1;
        while (Tenant::where('slug', $payload['slug'])->exists()) {
            $payload['slug'] = "{$baseSlug}-{$i}";
            $i++;
        }

        $tenant = Tenant::create($payload);

        return response()->json(['data' => $tenant, 'message' => 'Organization created'], 201);
    }

    // Show a single tenant
    public function show(Tenant $tenant)
    {
        return response()->json(['data' => $tenant]);
    }

    // Update tenant
    public function update(UpdateTenantRequest $request, Tenant $tenant)
    {
        $payload = $request->only([
            'name', 'domain', 'contact_email', 'phone', 'address', 'metadata', 'active'
        ]);

        // If name changed, update slug (but do not break existing references)
        if (isset($payload['name']) && $payload['name'] !== $tenant->name) {
            $slug = Str::slug($payload['name']);
            $baseSlug = $slug;
            $i = 1;
            while (Tenant::where('slug', $slug)->where('id', '!=', $tenant->id)->exists()) {
                $slug = "{$baseSlug}-{$i}";
                $i++;
            }
            $payload['slug'] = $slug;
        }

        $tenant->update($payload);

        return response()->json(['data' => $tenant, 'message' => 'Organization updated'], 200);
    }

    // Soft-delete
    public function destroy(Tenant $tenant)
    {
        $tenant->delete();
        return response()->json(['message' => 'Organization deleted'], 200);
    }

    // Restore soft-deleted tenant
    public function restore($id)
    {
        $tenant = Tenant::withTrashed()->findOrFail($id);
        if ($tenant->trashed()) {
            $tenant->restore();
            return response()->json(['data' => $tenant, 'message' => 'Organization restored']);
        }
        return response()->json(['message' => 'Organization not deleted'], 400);
    }
}
```

## app/Http/Controllers/AuthController.php

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Models\UserTenant;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            "email"                 => "required|email|unique:users,email",
            "password"              => "required|min:8|confirmed",
            "password_confirmation" => "required",
            "name"                  => "nullable|string|max:255",
            "occupation"            => "nullable|string|in:student,researcher,gov_staff,ngo_worker,fisherfolk,local_resident,faculty,consultant,tourist,other",
            "occupation_other"      => "nullable|string|max:255|required_if:occupation,other",
        ]);

        $resolvedName = $data["name"] ?? strtok($data["email"], "@");

        $user = User::create([
            "email"             => $data["email"],
            "password"          => Hash::make($data["password"]),
            "name"              => $resolvedName,
            "occupation"        => $data["occupation"] ?? null,
            "occupation_other"  => ($data["occupation"] ?? null) === "other" ? ($data["occupation_other"] ?? null) : null,
        ]);

        // Assign PUBLIC role
        if ($public = Role::where("name", "public")->first()) {
            UserTenant::create([
                "user_id"   => $user->id,
                "tenant_id" => null,
                "role_id"   => $public->id,
                "is_active" => true,
            ]);
        }

        // $token = $user->createToken("lv_token", ["public"], now()->addDays(30))->plainTextToken;

        return response()->json([
            'message' => 'Account created. Please log in.',
            "user"  => [
                "id"                => $user->id,
                "email"             => $user->email,
                "name"              => $user->name,
                "role"              => $user->highestRoleName(),
                "occupation"        => $user->occupation,
                "occupation_other"  => $user->occupation_other,
            ],
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            "email"    => "required|email",
            "password" => "required",
            "remember" => "sometimes|boolean",
        ]);

        $user = User::where("email", $credentials["email"])->first();

        if (!$user || !Hash::check($credentials["password"], $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.'
            ], 401);
        }

        $role = $user->highestRoleName();
        $abilities = match ($role) {
            "superadmin"  => ["superadmin"],
            "org_admin"   => ["org_admin"],
            "contributor" => ["contributor"],
            default       => ["public"],
        };

        $remember = (bool)($credentials["remember"] ?? false);
        $expiry = $remember ? now()->addDays(30) : now()->addHours(2);

        // Clear old tokens if you want single-session
        $user->tokens()->delete();

        $token = $user->createToken("lv_token", $abilities, $expiry)->plainTextToken;

        return response()->json([
            "token" => $token,
            "user"  => [
                "id"    => $user->id,
                "email" => $user->email,
                "name"  => $user->name,
                "role"  => $role,
                "occupation" => $user->occupation,
                "occupation_other" => $user->occupation_other,
            ],
        ]);
    }

    public function me(Request $request)
    {
        $u = $request->user();
        return response()->json([
            "id"    => $u->id,
            "email" => $u->email,
            "name"  => $u->name,
            "role"  => $u->highestRoleName(),
            "occupation" => $u->occupation,
            "occupation_other" => $u->occupation_other,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(["ok" => true]);
    }
}
```

## app/Http/Controllers/Controller.php

```php
<?php

namespace App\Http\Controllers;

abstract class Controller
{
    //
}
```

## app/Http/Controllers/EmailOtpController.php

```php
<?php

namespace App\Http\Controllers;

use App\Mail\OtpMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Cache, DB, Hash, Mail, Validator};
use Illuminate\Support\Str;

class EmailOtpController extends Controller
{
    // Tunables
    private int $codeLength = 6;
    private int $ttlMinutes = 10;              // OTP validity
    private int $resendCooldownSeconds = 180;  // 3 minutes
    private int $maxAttempts = 5;
    private int $resetTicketTtlMinutes = 15;   // ticket validity for reset

    private function now() { return now(); }

    private function makeCode(): string {
        return str_pad((string) random_int(0, 999999), $this->codeLength, '0', STR_PAD_LEFT);
    }

    private function codeHash(string $email, string $purpose, string $code): string {
        $pepper = config('app.otp_pepper') ?? env('OTP_PEPPER', '');
        return hash('sha256', "{$email}|{$purpose}|{$code}|{$pepper}");
    }

    private function sendOtp(string $email, string $code, string $purpose): void {
        Mail::to($email)->queue(new OtpMail($email, $code, $purpose, $this->ttlMinutes));
    }

    private function cooldownRemaining(?\DateTimeInterface $lastSentAt): int {
        if (!$lastSentAt) return 0;
        $elapsed = $this->now()->diffInSeconds($lastSentAt, true);
        return max(0, $this->resendCooldownSeconds - $elapsed);
    }

    private function upsertOtp(string $email, string $purpose, ?array $payload = null): array {
        $existing = DB::table('email_otps')
            ->where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->orderByDesc('id')
            ->first();

        if ($existing) {
            $remaining = $this->cooldownRemaining($existing->last_sent_at);
            if ($remaining > 0) {
                return ['ok' => false, 'cooldown' => $remaining];
            }
        }

        $code = $this->makeCode();
        $hash = $this->codeHash($email, $purpose, $code);
        $now  = $this->now();

        // Invalidate previous unconsumed codes for same email/purpose
        DB::table('email_otps')
            ->where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => $now]);

        DB::table('email_otps')->insert([
            'email'        => $email,
            'purpose'      => $purpose,
            'code_hash'    => $hash,
            'expires_at'   => $now->copy()->addMinutes($this->ttlMinutes),
            'last_sent_at' => $now,
            'attempts'     => 0,
            'payload'      => $payload ? json_encode($payload) : null,
            'created_at'   => $now,
            'updated_at'   => $now,
        ]);

        $this->sendOtp($email, $code, $purpose);

        return ['ok' => true, 'cooldown' => $this->resendCooldownSeconds];
    }

    private function checkOtp(string $email, string $purpose, string $code) {
        $row = DB::table('email_otps')
            ->where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->orderByDesc('id')
            ->first();

        if (!$row) return ['ok' => false, 'reason' => 'not_found'];
        if ($this->now()->greaterThan($row->expires_at)) return ['ok' => false, 'reason' => 'expired'];
        if ($row->attempts >= $this->maxAttempts) return ['ok' => false, 'reason' => 'too_many_attempts'];

        $expected = $row->code_hash;
        $actual   = $this->codeHash($email, $purpose, $code);
        $match    = hash_equals($expected, $actual);

        if (!$match) {
            DB::table('email_otps')->where('id', $row->id)->update([
                'attempts'   => $row->attempts + 1,
                'updated_at' => $this->now(),
            ]);
            return ['ok' => false, 'reason' => 'mismatch', 'attempts' => $row->attempts + 1];
        }

        // Consume
        DB::table('email_otps')->where('id', $row->id)->update([
            'consumed_at' => $this->now(),
            'updated_at'  => $this->now(),
        ]);

        return ['ok' => true, 'row' => $row];
    }

    /* -------- Registration -------- */

    public function registerRequestOtp(Request $r) {
        $v = Validator::make($r->all(), [
            'email' => ['required','email','max:255','unique:users,email'],
            'name'  => ['required','string','max:255'],
            'password' => ['required','string','min:8','confirmed'],
        ]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $payload = [
            'name'          => $r->name,
            'email'         => $r->email,
            'password_hash' => Hash::make($r->password),
        ];

        $res = $this->upsertOtp($r->email, 'register', $payload);
        if (!$res['ok']) {
            return response()->json(['ok' => false, 'cooldown_seconds' => $res['cooldown']], 429);
        }

        return response()->json(['ok' => true, 'cooldown_seconds' => $res['cooldown']]);
    }

    public function registerVerifyOtp(Request $r) {
        $v = Validator::make($r->all(), [
            'email'   => ['required','email'],
            'code'    => ['required','digits:6'],
            'remember'=> ['nullable','boolean'],
        ]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $check = $this->checkOtp($r->email, 'register', $r->code);
        if (!$check['ok']) return response()->json(['message' => 'Invalid or expired code.'], 422);

        $payload = json_decode($check['row']->payload ?? 'null', true) ?: [];
        $user = User::create([
            'name'              => $payload['name'] ?? 'User',
            'email'             => $r->email,
            'password'          => $payload['password_hash'] ?? Hash::make(Str::uuid()->toString()),
            'email_verified_at' => now(),
        ]);

        // Issue token (match your “remember me” durations)
        $abilities = ['*'];
        $expiry    = ($r->boolean('remember') ? now()->addDays(30) : now()->addHours(2));
        $token     = $user->createToken('api', $abilities, $expiry)->plainTextToken;

        return response()->json([
            'ok'                   => true,
            'user'                 => $user,
            'token'                => $token,
            'remember_expires_at'  => $expiry->toIso8601String(),
        ]);
    }

    /* -------- Forgot Password -------- */

    public function forgotRequestOtp(Request $r) {
        $v = Validator::make($r->all(), ['email' => ['required','email']]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $user = User::where('email', $r->email)->first();
        if ($user) {
            $res = $this->upsertOtp($r->email, 'reset', null);
            if (!$res['ok']) {
                return response()->json(['ok' => true, 'cooldown_seconds' => $res['cooldown']]);
            }
            return response()->json(['ok' => true, 'cooldown_seconds' => $this->resendCooldownSeconds]);
        }
        // Don’t leak user existence
        return response()->json(['ok' => true, 'cooldown_seconds' => $this->resendCooldownSeconds]);
    }

    public function forgotVerifyOtp(Request $r) {
        $v = Validator::make($r->all(), [
            'email' => ['required','email'],
            'code'  => ['required','digits:6'],
        ]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $check = $this->checkOtp($r->email, 'reset', $r->code);
        if (!$check['ok']) return response()->json(['message' => 'Invalid or expired code.'], 422);

        // Short-lived reset ticket
        $ticket = (string) Str::uuid();
        Cache::put("pwreset:{$ticket}", $r->email, now()->addMinutes($this->resetTicketTtlMinutes));

        return response()->json([
            'ok' => true,
            'ticket' => $ticket,
            'ticket_expires_in' => $this->resetTicketTtlMinutes * 60
        ]);
    }

    public function forgotReset(Request $r) {
        $v = Validator::make($r->all(), [
            'ticket' => ['required','uuid'],
            'password' => ['required','string','min:8','confirmed'],
        ]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $email = Cache::pull("pwreset:{$r->ticket}");
        if (!$email) return response()->json(['message' => 'Invalid or expired reset ticket.'], 422);

        $user = User::where('email', $email)->first();
        if (!$user) return response()->json(['message' => 'Account not found.'], 404);

        $user->forceFill(['password' => Hash::make($r->password)])->save();
        $user->tokens()->delete();

        return response()->json(['ok' => true]);
    }

    /* -------- Resend shared -------- */

    public function resend(Request $r) {
        $v = Validator::make($r->all(), [
            'email' => ['required','email'],
            'purpose' => ['required','in:register,reset'],
        ]);
        if ($v->fails()) return response()->json(['errors' => $v->errors()], 422);

        $res = $this->upsertOtp($r->email, $r->purpose, null);
        if (!$res['ok']) {
            return response()->json(['ok' => false, 'cooldown_seconds' => $res['cooldown']], 429);
        }
        return response()->json(['ok' => true, 'cooldown_seconds' => $this->resendCooldownSeconds]);
    }
}
```

## app/Http/Controllers/LakeController.php

```php
<?php

namespace App\Http\Controllers;

use App\Models\Lake;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;


class LakeController extends Controller
{
    public function index()
    {
        return Lake::select(
            'id','watershed_id','name','alt_name','region','province','municipality',
            'surface_area_km2','elevation_m','mean_depth_m','created_at','updated_at'
        )->with('watershed:id,name')->orderBy('name')->get();
    }

    public function show(Lake $lake)
    {
        // include GeoJSON from the active layer (default geometry)
        $lake->load('watershed:id,name');
        $active = $lake->activeLayer()
            ->select('id')
            ->selectRaw('ST_AsGeoJSON(geom) as geom_geojson')
            ->first();
        return array_merge($lake->toArray(), ['geom_geojson' => $active->geom_geojson ?? null]);
    }

    public function store(Request $req)
    {
        $data = $req->validate([
            'name' => ['required','string','max:255','unique:lakes,name'],
            'watershed_id' => ['nullable','exists:watersheds,id'],
            'alt_name' => ['nullable','string','max:255'],
            'region' => ['nullable','string','max:255'],
            'province' => ['nullable','string','max:255'],
            'municipality' => ['nullable','string','max:255'],
            'surface_area_km2' => ['nullable','numeric'],
            'elevation_m' => ['nullable','numeric'],
            'mean_depth_m' => ['nullable','numeric'],
        ]);
        $lake = Lake::create($data);
        return response()->json($lake->load('watershed:id,name'), 201);
    }

    public function update(Request $req, Lake $lake)
    {
        $data = $req->validate([
            'name' => ['required','string','max:255', Rule::unique('lakes','name')->ignore($lake->id)],
            'watershed_id' => ['nullable','exists:watersheds,id'],
            'alt_name' => ['nullable','string','max:255'],
            'region' => ['nullable','string','max:255'],
            'province' => ['nullable','string','max:255'],
            'municipality' => ['nullable','string','max:255'],
            'surface_area_km2' => ['nullable','numeric'],
            'elevation_m' => ['nullable','numeric'],
            'mean_depth_m' => ['nullable','numeric'],
        ]);
        $lake->update($data);
        return $lake->load('watershed:id,name');
    }

    public function destroy(Lake $lake)
    {
        $lake->delete();
        return response()->json(['message' => 'Lake deleted']);
    }
    
    public function publicGeo()
    {
        try {
            // ACTIVE + PUBLIC default layer per lake
            $rows = DB::table('lakes as l')
                ->join('layers as ly', function ($j) {
                    $j->on('ly.body_id', '=', 'l.id')
                    ->where('ly.body_type', 'lake')
                    ->where('ly.is_active', true)
                    ->where('ly.visibility', 'public');
                })
                ->leftJoin('watersheds as w', 'w.id', '=', 'l.watershed_id')
                ->whereNotNull('ly.geom')
                ->select(
                    'l.id','l.name','l.alt_name','l.region','l.province','l.municipality',
                    'l.surface_area_km2','l.elevation_m','l.mean_depth_m',
                    'l.created_at','l.updated_at',
                    'w.name as watershed_name',
                    'ly.id as layer_id',
                    DB::raw('ST_AsGeoJSON(ly.geom) as geom_geojson')
                )
                ->get();

            $features = [];
            foreach ($rows as $r) {
                if (!$r->geom_geojson) continue;
                $geom = json_decode($r->geom_geojson, true);
                if (!$geom) continue;

                $features[] = [
                    'type' => 'Feature',
                    'geometry' => $geom,
                    'properties' => [
                        'name'             => $r->name,
                        'alt_name'         => $r->alt_name,
                        'region'           => $r->region,
                        'province'         => $r->province,
                        'municipality'     => $r->municipality,
                        'watershed_name'   => $r->watershed_name,
                        'surface_area_km2' => $r->surface_area_km2,
                        'elevation_m'      => $r->elevation_m,
                        'mean_depth_m'     => $r->mean_depth_m,
                    ],
                ];
            }

            return response()->json([
                'type' => 'FeatureCollection',
                'features' => $features,
            ]);
        } catch (\Throwable $e) {
            Log::error('publicGeo failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to load public lakes',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
```

## app/Http/Controllers/WatershedController.php

```php
<?php

namespace App\Http\Controllers;

use App\Models\Watershed;

class WatershedController extends Controller
{
    public function index()
    {
        return Watershed::select('id','name')->orderBy('name')->get();
    }
}
```

## app/Http/Middleware/Authenticate.php

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    protected function redirectTo($request): ?string
    {
        // For APIs and AJAX, don't redirect — return 401 JSON.
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }
        // If you actually have a web login page, you could return route('login') here.
        return null;
    }
}
```

## app/Http/Middleware/EnforceTokenTTL.php

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Carbon\Carbon;

class EnforceTokenTTL
{
    public function handle(Request $request, Closure $next): Response
{
    $user = $request->user();
    if ($user && method_exists($user, 'currentAccessToken')) {
        $token = $user->currentAccessToken();

        if ($token) {
            // 1) If token has an explicit expires_at, respect it.
            if (!is_null($token->expires_at)) {
                if (now()->greaterThan($token->expires_at)) {
                    $token->delete();
                    return response()->json(['message' => 'Token expired'], 401);
                }
                // If not expired yet, allow request; skip TTL check entirely.
                return $next($request);
            }

            // 2) Otherwise, fall back to global TTL (if configured)
            $ttl = (int) config('auth.token_ttl_minutes', env('TOKEN_TTL_MINUTES', 1440)); // default 24h
            if ($ttl > 0 && $token->created_at) {
                if (Carbon::parse($token->created_at)->diffInMinutes(now()) > $ttl) {
                    $token->delete();
                    return response()->json(['message' => 'Token expired'], 401);
                }
            }
        }
    }

    return $next($request);
}

}
```

## app/Http/Middleware/EnsureRole.php

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureRole
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        if ($user->hasRole($roles)) {
            return $next($request);
        }
        return response()->json(['message' => 'Forbidden'], 403);
    }
}
```

## app/Http/Requests/StoreLayerRequest.php

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLayerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null; // role gate happens in controller
    }

    public function rules(): array
    {
        return [
            'body_type'   => 'required|string|in:lake,watershed',
            'body_id'     => 'required|integer|min:1',
            'name'        => 'required|string|max:255',
            'type'        => 'nullable|string|max:64',
            'category'    => 'nullable|string|max:64',
            'srid'        => 'nullable|integer|min:0',
            'visibility'  => 'nullable|string|in:admin,public',
            'is_active'   => 'nullable|boolean',
            'status'      => 'nullable|string|in:draft,ready,archived',
            'version'     => 'nullable|integer|min:1',
            'notes'       => 'nullable|string',
            'source_type' => 'nullable|string|in:geojson,json,shp,kml,gpkg,wkt',

            // The geometry payload (Polygon or MultiPolygon), or a Feature with geometry
            'geom_geojson' => 'required|string',
        ];
    }
}
```

## app/Http/Requests/StoreTenantRequest.php

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTenantRequest extends FormRequest
{
    public function authorize()
    {
        // We'll rely on middleware to restrict access, but keep authorize true.
        return true;
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'domain' => 'nullable|string|max:255|unique:tenants,domain',
            'contact_email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'metadata' => 'nullable|array',
            'active' => 'sometimes|boolean',
        ];
    }
}
```

## app/Http/Requests/UpdateLayerRequest.php

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLayerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null; // role gate happens in controller
    }

    public function rules(): array
    {
        return [
            'name'        => 'sometimes|string|max:255',
            'type'        => 'sometimes|string|max:64',
            'category'    => 'sometimes|nullable|string|max:64',
            'srid'        => 'sometimes|nullable|integer|min:0',
            'visibility'  => 'sometimes|string|in:admin,public',
            'is_active'   => 'sometimes|boolean',
            'status'      => 'sometimes|string|in:draft,ready,archived',
            'version'     => 'sometimes|integer|min:1',
            'notes'       => 'sometimes|nullable|string',
            'source_type' => 'sometimes|string|in:geojson,json,shp,kml,gpkg,wkt',

            // Optional geometry replacement
            'geom_geojson' => 'sometimes|string',
        ];
    }
}
```

## app/Http/Requests/UpdateTenantRequest.php

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTenantRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $tenantId = $this->route('tenant') ? $this->route('tenant')->id : null;

        return [
            'name' => 'required|string|max:255',
            'domain' => 'nullable|string|max:255|unique:tenants,domain,' . $tenantId,
            'contact_email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'metadata' => 'nullable|array',
            'active' => 'sometimes|boolean',
        ];
    }
}
```

## app/Mail/OtpMail.php

```php
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $email,
        public string $code,
        public string $purpose, // 'register' | 'reset'
        public int $ttlMinutes
    ) {}

    public function build() {
        $subject = "Your LakeView PH verification code: {$this->code}";
        return $this->subject($subject)
            ->text('mail.plain', [
                'content' => <<<TEXT
Hi,

Your LakeView PH verification code is:

{$this->code}

This code expires in {$this->ttlMinutes} minutes. If you didn’t request it, you can ignore this email.

— LakeView PH
TEXT
            ]);
    }
}
```

## app/Models/Lake.php

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lake extends Model
{
    protected $fillable = [
        'watershed_id','name','alt_name','region','province','municipality',
        'surface_area_km2','elevation_m','mean_depth_m'
    ];

    // A lake belongs to a watershed (nullable is okay)
    public function watershed()
    {
        return $this->belongsTo(Watershed::class, 'watershed_id', 'id');
        // If you want a non-null object even when missing:
        // return $this->belongsTo(Watershed::class, 'watershed_id', 'id')->withDefault();
    }

    public function layers()
    {
        return $this->morphMany(\App\Models\Layer::class, 'body');
    }
    
    public function activeLayer()
    {
        return $this->morphOne(\App\Models\Layer::class, 'body')->where('is_active', true);
    }

}
```

## app/Models/Layer.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Layer extends Model
{
    protected $table = 'layers';

    protected $fillable = [
        'body_type','body_id','uploaded_by',
        'name','type','category','srid',
        'visibility','is_active','status','version','notes',
        'source_type',
        // 'geom','bbox','area_km2' are managed via PostGIS/trigger; leave out of mass-assign by default
    ];

    protected $casts = [
        'is_active'        => 'boolean',
        'version'          => 'integer',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
    ];

    // Polymorphic parent (Lake or Watershed, and future bodies)
    public function body(): MorphTo
    {
        return $this->morphTo();
    }

    // Convenience: scope active/public
    public function scopeActive($q)   { return $q->where('is_active', true); }
    public function scopePublic($q)   { return $q->where('visibility', 'public'); }
    public function scopeFor($q, string $type, int $id) { return $q->where(['body_type'=>$type,'body_id'=>$id]); }

    // Tip: when returning to the frontend map, select GeoJSON from the DB:
    // Layer::select('*')->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')->get();
}
```

## app/Models/Role.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['name','scope'];
}
```

## app/Models/Tenant.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tenants';

    protected $fillable = [
        'name',
        'slug',
        'domain',
        'contact_email',
        'phone',
        'address',
        'metadata',
        'active',
    ];

    protected $casts = [
        'metadata' => 'array',
        'active' => 'boolean',
    ];

    // If you want to auto-generate slug on create/update, we do it in controller.
}
```

## app/Models/User.php

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Arr;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name','email','password'
        ,'occupation','occupation_other'
    ];
    
    protected $hidden = ['password', 'remember_token'];

    public function memberships()
    {
        return $this->hasMany(UserTenant::class);
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_tenants')
            ->withPivot(['tenant_id','is_active'])
            ->withTimestamps();
    }

    public function hasRole($roles): bool
    {
        $roles = Arr::flatten(is_array($roles) ? $roles : [$roles]);
        $roles = array_values(array_filter(array_map(
            static fn($role) => is_null($role) ? null : strtolower((string) trim($role)),
            $roles
        ), static fn($role) => !is_null($role) && $role !== ''));
        if (empty($roles)) {
            return false;
        }

        $current = $this->role ? strtolower($this->role) : null;
        if ($current && in_array($current, $roles, true)) {
            return true;
        }

        if ($this->relationLoaded('roles')) {
            return $this->roles
                ->pluck('name')
                ->filter()
                ->map(static fn($name) => strtolower($name))
                ->intersect($roles)
                ->isNotEmpty();
        }

        return $this->roles()
            ->whereIn('roles.name', $roles)
            ->exists();
    }

    public function highestRoleName(): string
    {
        $order = ['superadmin'=>4,'org_admin'=>3,'contributor'=>2,'public'=>1];
        $best = 'public';
        $rank = 0;

        foreach ($this->roles as $role) {
            $r = $order[$role->name] ?? 0;
            if ($r > $rank) { $rank = $r; $best = $role->name; }
        }
        return $best;
    }
}
```

## (Legacy Removed) app/Models/UserTenant.php

Removed during single-tenant refactor (Sept 2025). Previous responsibilities: pivot join between users & tenants with role context. Replaced by direct `users.tenant_id` + `users.role_id` and audit table `user_tenant_changes`.

## app/Models/Watershed.php

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Watershed extends Model
{
    protected $fillable = ['name','description','region','province','municipality'];

    // A watershed has many lakes
    public function lakes()
    {
        return $this->hasMany(Lake::class, 'watershed_id', 'id');
    }
    
    public function layers()
    {
        return $this->morphMany(\App\Models\Layer::class, 'body');
    }

    public function activeLayer()
    {
        return $this->morphOne(\App\Models\Layer::class, 'body')->where('is_active', true);
    }

}
```

## app/Providers/AppServiceProvider.php

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Relations\Relation;
use App\Models\Lake;
use App\Models\Watershed;
use App\Models\User;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Relation::enforceMorphMap([
        'lake'      => Lake::class,
        'watershed' => Watershed::class,
        'user' => User::class
        // add more when you support other bodies
    ]);
    }
}
```

## bootstrap/app.php

```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            "role" => \App\Http\Middleware\EnsureRole::class,
        ]);

        // Bearer-token mode (no stateful Sanctum, no CSRF in API)
        // Use numeric throttle to avoid named limiter errors here.
        $middleware->appendToGroup("api", [
            "throttle:60,1",
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();
```

## bootstrap/providers.php

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
];
```

## config/app.php

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Application Name
    |--------------------------------------------------------------------------
    |
    | This value is the name of your application, which will be used when the
    | framework needs to place the application's name in a notification or
    | other UI elements where an application name needs to be displayed.
    |
    */

    'name' => env('APP_NAME', 'Laravel'),

    /*
    |--------------------------------------------------------------------------
    | Application Environment
    |--------------------------------------------------------------------------
    |
    | This value determines the "environment" your application is currently
    | running in. This may determine how you prefer to configure various
    | services the application utilizes. Set this in your ".env" file.
    |
    */

    'env' => env('APP_ENV', 'production'),

    /*
    |--------------------------------------------------------------------------
    | Application Debug Mode
    |--------------------------------------------------------------------------
    |
    | When your application is in debug mode, detailed error messages with
    | stack traces will be shown on every error that occurs within your
    | application. If disabled, a simple generic error page is shown.
    |
    */

    'debug' => (bool) env('APP_DEBUG', false),

    /*
    |--------------------------------------------------------------------------
    | Application URL
    |--------------------------------------------------------------------------
    |
    | This URL is used by the console to properly generate URLs when using
    | the Artisan command line tool. You should set this to the root of
    | the application so that it's available within Artisan commands.
    |
    */

    'url' => env('APP_URL', 'http://localhost'),

    /*
    |--------------------------------------------------------------------------
    | Application Timezone
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default timezone for your application, which
    | will be used by the PHP date and date-time functions. The timezone
    | is set to "UTC" by default as it is suitable for most use cases.
    |
    */

    'timezone' => 'UTC',

    /*
    |--------------------------------------------------------------------------
    | Application Locale Configuration
    |--------------------------------------------------------------------------
    |
    | The application locale determines the default locale that will be used
    | by Laravel's translation / localization methods. This option can be
    | set to any locale for which you plan to have translation strings.
    |
    */

    'locale' => env('APP_LOCALE', 'en'),

    'fallback_locale' => env('APP_FALLBACK_LOCALE', 'en'),

    'faker_locale' => env('APP_FAKER_LOCALE', 'en_US'),

    /*
    |--------------------------------------------------------------------------
    | Encryption Key
    |--------------------------------------------------------------------------
    |
    | This key is utilized by Laravel's encryption services and should be set
    | to a random, 32 character string to ensure that all encrypted values
    | are secure. You should do this prior to deploying the application.
    |
    */

    'otp_pepper' => env('OTP_PEPPER', ''),

    'cipher' => 'AES-256-CBC',

    'key' => env('APP_KEY'),

    'previous_keys' => [
        ...array_filter(
            explode(',', (string) env('APP_PREVIOUS_KEYS', ''))
        ),
    ],

    /*
    |--------------------------------------------------------------------------
    | Maintenance Mode Driver
    |--------------------------------------------------------------------------
    |
    | These configuration options determine the driver used to determine and
    | manage Laravel's "maintenance mode" status. The "cache" driver will
    | allow maintenance mode to be controlled across multiple machines.
    |
    | Supported drivers: "file", "cache"
    |
    */

    'maintenance' => [
        'driver' => env('APP_MAINTENANCE_DRIVER', 'file'),
        'store' => env('APP_MAINTENANCE_STORE', 'database'),
    ],

];
```

## config/auth.php

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Defaults
    |--------------------------------------------------------------------------
    |
    | This option defines the default authentication "guard" and password
    | reset "broker" for your application. You may change these values
    | as required, but they're a perfect start for most applications.
    |
    */

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),
        'passwords' => env('AUTH_PASSWORD_BROKER', 'users'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Authentication Guards
    |--------------------------------------------------------------------------
    |
    | Next, you may define every authentication guard for your application.
    | Of course, a great default configuration has been defined for you
    | which utilizes session storage plus the Eloquent user provider.
    |
    | All authentication guards have a user provider, which defines how the
    | users are actually retrieved out of your database or other storage
    | system used by the application. Typically, Eloquent is utilized.
    |
    | Supported: "session"
    |
    */

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Providers
    |--------------------------------------------------------------------------
    |
    | All authentication guards have a user provider, which defines how the
    | users are actually retrieved out of your database or other storage
    | system used by the application. Typically, Eloquent is utilized.
    |
    | If you have multiple user tables or models you may configure multiple
    | providers to represent the model / table. These providers may then
    | be assigned to any extra authentication guards you have defined.
    |
    | Supported: "database", "eloquent"
    |
    */

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => env('AUTH_MODEL', App\Models\User::class),
        ],

        // 'users' => [
        //     'driver' => 'database',
        //     'table' => 'users',
        // ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Resetting Passwords
    |--------------------------------------------------------------------------
    |
    | These configuration options specify the behavior of Laravel's password
    | reset functionality, including the table utilized for token storage
    | and the user provider that is invoked to actually retrieve users.
    |
    | The expiry time is the number of minutes that each reset token will be
    | considered valid. This security feature keeps tokens short-lived so
    | they have less time to be guessed. You may change this as needed.
    |
    | The throttle setting is the number of seconds a user must wait before
    | generating more password reset tokens. This prevents the user from
    | quickly generating a very large amount of password reset tokens.
    |
    */

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Confirmation Timeout
    |--------------------------------------------------------------------------
    |
    | Here you may define the number of seconds before a password confirmation
    | window expires and users are asked to re-enter their password via the
    | confirmation screen. By default, the timeout lasts for three hours.
    |
    */

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
```

## config/cache.php

```php
<?php

use Illuminate\Support\Str;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Cache Store
    |--------------------------------------------------------------------------
    |
    | This option controls the default cache store that will be used by the
    | framework. This connection is utilized if another isn't explicitly
    | specified when running a cache operation inside the application.
    |
    */

    'default' => env('CACHE_STORE', 'database'),

    /*
    |--------------------------------------------------------------------------
    | Cache Stores
    |--------------------------------------------------------------------------
    |
    | Here you may define all of the cache "stores" for your application as
    | well as their drivers. You may even define multiple stores for the
    | same cache driver to group types of items stored in your caches.
    |
    | Supported drivers: "array", "database", "file", "memcached",
    |                    "redis", "dynamodb", "octane", "null"
    |
    */

    'stores' => [

        'array' => [
            'driver' => 'array',
            'serialize' => false,
        ],

        'database' => [
            'driver' => 'database',
            'connection' => env('DB_CACHE_CONNECTION'),
            'table' => env('DB_CACHE_TABLE', 'cache'),
            'lock_connection' => env('DB_CACHE_LOCK_CONNECTION'),
            'lock_table' => env('DB_CACHE_LOCK_TABLE'),
        ],

        'file' => [
            'driver' => 'file',
            'path' => storage_path('framework/cache/data'),
            'lock_path' => storage_path('framework/cache/data'),
        ],

        'memcached' => [
            'driver' => 'memcached',
            'persistent_id' => env('MEMCACHED_PERSISTENT_ID'),
            'sasl' => [
                env('MEMCACHED_USERNAME'),
                env('MEMCACHED_PASSWORD'),
            ],
            'options' => [
                // Memcached::OPT_CONNECT_TIMEOUT => 2000,
            ],
            'servers' => [
                [
                    'host' => env('MEMCACHED_HOST', '127.0.0.1'),
                    'port' => env('MEMCACHED_PORT', 11211),
                    'weight' => 100,
                ],
            ],
        ],

        'redis' => [
            'driver' => 'redis',
            'connection' => env('REDIS_CACHE_CONNECTION', 'cache'),
            'lock_connection' => env('REDIS_CACHE_LOCK_CONNECTION', 'default'),
        ],

        'dynamodb' => [
            'driver' => 'dynamodb',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'table' => env('DYNAMODB_CACHE_TABLE', 'cache'),
            'endpoint' => env('DYNAMODB_ENDPOINT'),
        ],

        'octane' => [
            'driver' => 'octane',
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Cache Key Prefix
    |--------------------------------------------------------------------------
    |
    | When utilizing the APC, database, memcached, Redis, and DynamoDB cache
    | stores, there might be other applications using the same cache. For
    | that reason, you may prefix every cache key to avoid collisions.
    |
    */

    'prefix' => env('CACHE_PREFIX', Str::slug((string) env('APP_NAME', 'laravel')).'-cache-'),

];
```

## config/database.php

```php
<?php

use Illuminate\Support\Str;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Database Connection Name
    |--------------------------------------------------------------------------
    |
    | Here you may specify which of the database connections below you wish
    | to use as your default connection for database operations. This is
    | the connection which will be utilized unless another connection
    | is explicitly specified when you execute a query / statement.
    |
    */

    'default' => env('DB_CONNECTION', 'sqlite'),

    /*
    |--------------------------------------------------------------------------
    | Database Connections
    |--------------------------------------------------------------------------
    |
    | Below are all of the database connections defined for your application.
    | An example configuration is provided for each database system which
    | is supported by Laravel. You're free to add / remove connections.
    |
    */

    'connections' => [

        'sqlite' => [
            'driver' => 'sqlite',
            'url' => env('DB_URL'),
            'database' => env('DB_DATABASE', database_path('database.sqlite')),
            'prefix' => '',
            'foreign_key_constraints' => env('DB_FOREIGN_KEYS', true),
            'busy_timeout' => null,
            'journal_mode' => null,
            'synchronous' => null,
            'transaction_mode' => 'DEFERRED',
        ],

        'mysql' => [
            'driver' => 'mysql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'laravel'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'unix_socket' => env('DB_SOCKET', ''),
            'charset' => env('DB_CHARSET', 'utf8mb4'),
            'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
            'options' => extension_loaded('pdo_mysql') ? array_filter([
                PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
            ]) : [],
        ],

        'mariadb' => [
            'driver' => 'mariadb',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'laravel'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'unix_socket' => env('DB_SOCKET', ''),
            'charset' => env('DB_CHARSET', 'utf8mb4'),
            'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
            'options' => extension_loaded('pdo_mysql') ? array_filter([
                PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
            ]) : [],
        ],

        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'laravel'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => env('DB_CHARSET', 'utf8'),
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ],

        'sqlsrv' => [
            'driver' => 'sqlsrv',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', 'localhost'),
            'port' => env('DB_PORT', '1433'),
            'database' => env('DB_DATABASE', 'laravel'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => env('DB_CHARSET', 'utf8'),
            'prefix' => '',
            'prefix_indexes' => true,
            // 'encrypt' => env('DB_ENCRYPT', 'yes'),
            // 'trust_server_certificate' => env('DB_TRUST_SERVER_CERTIFICATE', 'false'),
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Migration Repository Table
    |--------------------------------------------------------------------------
    |
    | This table keeps track of all the migrations that have already run for
    | your application. Using this information, we can determine which of
    | the migrations on disk haven't actually been run on the database.
    |
    */

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Redis Databases
    |--------------------------------------------------------------------------
    |
    | Redis is an open source, fast, and advanced key-value store that also
    | provides a richer body of commands than a typical key-value system
    | such as Memcached. You may define your connection settings here.
    |
    */

    'redis' => [

        'client' => env('REDIS_CLIENT', 'phpredis'),

        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => env('REDIS_PREFIX', Str::slug((string) env('APP_NAME', 'laravel')).'-database-'),
            'persistent' => env('REDIS_PERSISTENT', false),
        ],

        'default' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '0'),
            'max_retries' => env('REDIS_MAX_RETRIES', 3),
            'backoff_algorithm' => env('REDIS_BACKOFF_ALGORITHM', 'decorrelated_jitter'),
            'backoff_base' => env('REDIS_BACKOFF_BASE', 100),
            'backoff_cap' => env('REDIS_BACKOFF_CAP', 1000),
        ],

        'cache' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_CACHE_DB', '1'),
            'max_retries' => env('REDIS_MAX_RETRIES', 3),
            'backoff_algorithm' => env('REDIS_BACKOFF_ALGORITHM', 'decorrelated_jitter'),
            'backoff_base' => env('REDIS_BACKOFF_BASE', 100),
            'backoff_cap' => env('REDIS_BACKOFF_CAP', 1000),
        ],

    ],

];
```

## config/filesystems.php

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
```

## config/logging.php

```php
<?php

use Monolog\Handler\NullHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\SyslogUdpHandler;
use Monolog\Processor\PsrLogMessageProcessor;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Log Channel
    |--------------------------------------------------------------------------
    |
    | This option defines the default log channel that is utilized to write
    | messages to your logs. The value provided here should match one of
    | the channels present in the list of "channels" configured below.
    |
    */

    'default' => env('LOG_CHANNEL', 'stack'),

    /*
    |--------------------------------------------------------------------------
    | Deprecations Log Channel
    |--------------------------------------------------------------------------
    |
    | This option controls the log channel that should be used to log warnings
    | regarding deprecated PHP and library features. This allows you to get
    | your application ready for upcoming major versions of dependencies.
    |
    */

    'deprecations' => [
        'channel' => env('LOG_DEPRECATIONS_CHANNEL', 'null'),
        'trace' => env('LOG_DEPRECATIONS_TRACE', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Log Channels
    |--------------------------------------------------------------------------
    |
    | Here you may configure the log channels for your application. Laravel
    | utilizes the Monolog PHP logging library, which includes a variety
    | of powerful log handlers and formatters that you're free to use.
    |
    | Available drivers: "single", "daily", "slack", "syslog",
    |                    "errorlog", "monolog", "custom", "stack"
    |
    */

    'channels' => [

        'stack' => [
            'driver' => 'stack',
            'channels' => explode(',', (string) env('LOG_STACK', 'single')),
            'ignore_exceptions' => false,
        ],

        'single' => [
            'driver' => 'single',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

        'daily' => [
            'driver' => 'daily',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'days' => env('LOG_DAILY_DAYS', 14),
            'replace_placeholders' => true,
        ],

        'slack' => [
            'driver' => 'slack',
            'url' => env('LOG_SLACK_WEBHOOK_URL'),
            'username' => env('LOG_SLACK_USERNAME', 'Laravel Log'),
            'emoji' => env('LOG_SLACK_EMOJI', ':boom:'),
            'level' => env('LOG_LEVEL', 'critical'),
            'replace_placeholders' => true,
        ],

        'papertrail' => [
            'driver' => 'monolog',
            'level' => env('LOG_LEVEL', 'debug'),
            'handler' => env('LOG_PAPERTRAIL_HANDLER', SyslogUdpHandler::class),
            'handler_with' => [
                'host' => env('PAPERTRAIL_URL'),
                'port' => env('PAPERTRAIL_PORT'),
                'connectionString' => 'tls://'.env('PAPERTRAIL_URL').':'.env('PAPERTRAIL_PORT'),
            ],
            'processors' => [PsrLogMessageProcessor::class],
        ],

        'stderr' => [
            'driver' => 'monolog',
            'level' => env('LOG_LEVEL', 'debug'),
            'handler' => StreamHandler::class,
            'handler_with' => [
                'stream' => 'php://stderr',
            ],
            'formatter' => env('LOG_STDERR_FORMATTER'),
            'processors' => [PsrLogMessageProcessor::class],
        ],

        'syslog' => [
            'driver' => 'syslog',
            'level' => env('LOG_LEVEL', 'debug'),
            'facility' => env('LOG_SYSLOG_FACILITY', LOG_USER),
            'replace_placeholders' => true,
        ],

        'errorlog' => [
            'driver' => 'errorlog',
            'level' => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

        'null' => [
            'driver' => 'monolog',
            'handler' => NullHandler::class,
        ],

        'emergency' => [
            'path' => storage_path('logs/laravel.log'),
        ],

    ],

];
```

## config/mail.php

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Mailer
    |--------------------------------------------------------------------------
    |
    | This option controls the default mailer that is used to send all email
    | messages unless another mailer is explicitly specified when sending
    | the message. All additional mailers can be configured within the
    | "mailers" array. Examples of each type of mailer are provided.
    |
    */

    'default' => env('MAIL_MAILER', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    |
    | Here you may configure all of the mailers used by your application plus
    | their respective settings. Several examples have been configured for
    | you and you are free to add your own as your application requires.
    |
    | Laravel supports a variety of mail "transport" drivers that can be used
    | when delivering an email. You may specify which one you're using for
    | your mailers below. You may also add additional mailers if needed.
    |
    | Supported: "smtp", "sendmail", "mailgun", "ses", "ses-v2",
    |            "postmark", "resend", "log", "array",
    |            "failover", "roundrobin"
    |
    */

    'mailers' => [

        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME'),
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 2525),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => null,
            'local_domain' => env('MAIL_EHLO_DOMAIN', parse_url((string) env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
        ],

        'ses' => [
            'transport' => 'ses',
        ],

        'postmark' => [
            'transport' => 'postmark',
            // 'message_stream_id' => env('POSTMARK_MESSAGE_STREAM_ID'),
            // 'client' => [
            //     'timeout' => 5,
            // ],
        ],

        'resend' => [
            'transport' => 'resend',
        ],

        'sendmail' => [
            'transport' => 'sendmail',
            'path' => env('MAIL_SENDMAIL_PATH', '/usr/sbin/sendmail -bs -i'),
        ],

        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],

        'failover' => [
            'transport' => 'failover',
            'mailers' => [
                'smtp',
                'log',
            ],
            'retry_after' => 60,
        ],

        'roundrobin' => [
            'transport' => 'roundrobin',
            'mailers' => [
                'ses',
                'postmark',
            ],
            'retry_after' => 60,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Global "From" Address
    |--------------------------------------------------------------------------
    |
    | You may wish for all emails sent by your application to be sent from
    | the same address. Here you may specify a name and address that is
    | used globally for all emails that are sent by your application.
    |
    */

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'hello@example.com'),
        'name' => env('MAIL_FROM_NAME', 'Example'),
    ],

];
```

## config/queue.php

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Queue Connection Name
    |--------------------------------------------------------------------------
    |
    | Laravel's queue supports a variety of backends via a single, unified
    | API, giving you convenient access to each backend using identical
    | syntax for each. The default queue connection is defined below.
    |
    */

    'default' => env('QUEUE_CONNECTION', 'database'),

    /*
    |--------------------------------------------------------------------------
    | Queue Connections
    |--------------------------------------------------------------------------
    |
    | Here you may configure the connection options for every queue backend
    | used by your application. An example configuration is provided for
    | each backend supported by Laravel. You're also free to add more.
    |
    | Drivers: "sync", "database", "beanstalkd", "sqs", "redis", "null"
    |
    */

    'connections' => [

        'sync' => [
            'driver' => 'sync',
        ],

        'database' => [
            'driver' => 'database',
            'connection' => env('DB_QUEUE_CONNECTION'),
            'table' => env('DB_QUEUE_TABLE', 'jobs'),
            'queue' => env('DB_QUEUE', 'default'),
            'retry_after' => (int) env('DB_QUEUE_RETRY_AFTER', 90),
            'after_commit' => false,
        ],

        'beanstalkd' => [
            'driver' => 'beanstalkd',
            'host' => env('BEANSTALKD_QUEUE_HOST', 'localhost'),
            'queue' => env('BEANSTALKD_QUEUE', 'default'),
            'retry_after' => (int) env('BEANSTALKD_QUEUE_RETRY_AFTER', 90),
            'block_for' => 0,
            'after_commit' => false,
        ],

        'sqs' => [
            'driver' => 'sqs',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'prefix' => env('SQS_PREFIX', 'https://sqs.us-east-1.amazonaws.com/your-account-id'),
            'queue' => env('SQS_QUEUE', 'default'),
            'suffix' => env('SQS_SUFFIX'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'after_commit' => false,
        ],

        'redis' => [
            'driver' => 'redis',
            'connection' => env('REDIS_QUEUE_CONNECTION', 'default'),
            'queue' => env('REDIS_QUEUE', 'default'),
            'retry_after' => (int) env('REDIS_QUEUE_RETRY_AFTER', 90),
            'block_for' => null,
            'after_commit' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Job Batching
    |--------------------------------------------------------------------------
    |
    | The following options configure the database and table that store job
    | batching information. These options can be updated to any database
    | connection and table which has been defined by your application.
    |
    */

    'batching' => [
        'database' => env('DB_CONNECTION', 'sqlite'),
        'table' => 'job_batches',
    ],

    /*
    |--------------------------------------------------------------------------
    | Failed Queue Jobs
    |--------------------------------------------------------------------------
    |
    | These options configure the behavior of failed queue job logging so you
    | can control how and where failed jobs are stored. Laravel ships with
    | support for storing failed jobs in a simple file or in a database.
    |
    | Supported drivers: "database-uuids", "dynamodb", "file", "null"
    |
    */

    'failed' => [
        'driver' => env('QUEUE_FAILED_DRIVER', 'database-uuids'),
        'database' => env('DB_CONNECTION', 'sqlite'),
        'table' => 'failed_jobs',
    ],

];
```

## config/sanctum.php

```php
<?php

use Laravel\Sanctum\Sanctum;

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Requests from the following domains / hosts will receive stateful API
    | authentication cookies. Typically, these should include your local
    | and production domains which access your API via a frontend SPA.
    |
    */

    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
        Sanctum::currentApplicationUrlWithPort(),
        // Sanctum::currentRequestHost(),
    ))),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    |
    | This array contains the authentication guards that will be checked when
    | Sanctum is trying to authenticate a request. If none of these guards
    | are able to authenticate the request, Sanctum will use the bearer
    | token that's present on an incoming request for authentication.
    |
    */

    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    |
    | This value controls the number of minutes until an issued token will be
    | considered expired. This will override any values set in the token's
    | "expires_at" attribute, but first-party sessions are not affected.
    |
    */

    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    |
    | Sanctum can prefix new tokens in order to take advantage of numerous
    | security scanning initiatives maintained by open source platforms
    | that notify developers if they commit tokens into repositories.
    |
    | See: https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning
    |
    */

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    |
    | When authenticating your first-party SPA with Sanctum you may need to
    | customize some of the middleware Sanctum uses while processing the
    | request. You may change the middleware listed below as required.
    |
    */

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];
```

## config/services.php

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
```

## config/session.php

```php
<?php

use Illuminate\Support\Str;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Session Driver
    |--------------------------------------------------------------------------
    |
    | This option determines the default session driver that is utilized for
    | incoming requests. Laravel supports a variety of storage options to
    | persist session data. Database storage is a great default choice.
    |
    | Supported: "file", "cookie", "database", "memcached",
    |            "redis", "dynamodb", "array"
    |
    */

    'driver' => env('SESSION_DRIVER', 'database'),

    /*
    |--------------------------------------------------------------------------
    | Session Lifetime
    |--------------------------------------------------------------------------
    |
    | Here you may specify the number of minutes that you wish the session
    | to be allowed to remain idle before it expires. If you want them
    | to expire immediately when the browser is closed then you may
    | indicate that via the expire_on_close configuration option.
    |
    */

    'lifetime' => (int) env('SESSION_LIFETIME', 120),

    'expire_on_close' => env('SESSION_EXPIRE_ON_CLOSE', false),

    /*
    |--------------------------------------------------------------------------
    | Session Encryption
    |--------------------------------------------------------------------------
    |
    | This option allows you to easily specify that all of your session data
    | should be encrypted before it's stored. All encryption is performed
    | automatically by Laravel and you may use the session like normal.
    |
    */

    'encrypt' => env('SESSION_ENCRYPT', false),

    /*
    |--------------------------------------------------------------------------
    | Session File Location
    |--------------------------------------------------------------------------
    |
    | When utilizing the "file" session driver, the session files are placed
    | on disk. The default storage location is defined here; however, you
    | are free to provide another location where they should be stored.
    |
    */

    'files' => storage_path('framework/sessions'),

    /*
    |--------------------------------------------------------------------------
    | Session Database Connection
    |--------------------------------------------------------------------------
    |
    | When using the "database" or "redis" session drivers, you may specify a
    | connection that should be used to manage these sessions. This should
    | correspond to a connection in your database configuration options.
    |
    */

    'connection' => env('SESSION_CONNECTION'),

    /*
    |--------------------------------------------------------------------------
    | Session Database Table
    |--------------------------------------------------------------------------
    |
    | When using the "database" session driver, you may specify the table to
    | be used to store sessions. Of course, a sensible default is defined
    | for you; however, you're welcome to change this to another table.
    |
    */

    'table' => env('SESSION_TABLE', 'sessions'),

    /*
    |--------------------------------------------------------------------------
    | Session Cache Store
    |--------------------------------------------------------------------------
    |
    | When using one of the framework's cache driven session backends, you may
    | define the cache store which should be used to store the session data
    | between requests. This must match one of your defined cache stores.
    |
    | Affects: "dynamodb", "memcached", "redis"
    |
    */

    'store' => env('SESSION_STORE'),

    /*
    |--------------------------------------------------------------------------
    | Session Sweeping Lottery
    |--------------------------------------------------------------------------
    |
    | Some session drivers must manually sweep their storage location to get
    | rid of old sessions from storage. Here are the chances that it will
    | happen on a given request. By default, the odds are 2 out of 100.
    |
    */

    'lottery' => [2, 100],

    /*
    |--------------------------------------------------------------------------
    | Session Cookie Name
    |--------------------------------------------------------------------------
    |
    | Here you may change the name of the session cookie that is created by
    | the framework. Typically, you should not need to change this value
    | since doing so does not grant a meaningful security improvement.
    |
    */

    'cookie' => env(
        'SESSION_COOKIE',
        Str::slug(env('APP_NAME', 'laravel')).'-session'
    ),

    /*
    |--------------------------------------------------------------------------
    | Session Cookie Path
    |--------------------------------------------------------------------------
    |
    | The session cookie path determines the path for which the cookie will
    | be regarded as available. Typically, this will be the root path of
    | your application, but you're free to change this when necessary.
    |
    */

    'path' => env('SESSION_PATH', '/'),

    /*
    |--------------------------------------------------------------------------
    | Session Cookie Domain
    |--------------------------------------------------------------------------
    |
    | This value determines the domain and subdomains the session cookie is
    | available to. By default, the cookie will be available to the root
    | domain and all subdomains. Typically, this shouldn't be changed.
    |
    */

    'domain' => env('SESSION_DOMAIN'),

    /*
    |--------------------------------------------------------------------------
    | HTTPS Only Cookies
    |--------------------------------------------------------------------------
    |
    | By setting this option to true, session cookies will only be sent back
    | to the server if the browser has a HTTPS connection. This will keep
    | the cookie from being sent to you when it can't be done securely.
    |
    */

    'secure' => env('SESSION_SECURE_COOKIE'),

    /*
    |--------------------------------------------------------------------------
    | HTTP Access Only
    |--------------------------------------------------------------------------
    |
    | Setting this value to true will prevent JavaScript from accessing the
    | value of the cookie and the cookie will only be accessible through
    | the HTTP protocol. It's unlikely you should disable this option.
    |
    */

    'http_only' => env('SESSION_HTTP_ONLY', true),

    /*
    |--------------------------------------------------------------------------
    | Same-Site Cookies
    |--------------------------------------------------------------------------
    |
    | This option determines how your cookies behave when cross-site requests
    | take place, and can be used to mitigate CSRF attacks. By default, we
    | will set this value to "lax" to permit secure cross-site requests.
    |
    | See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value
    |
    | Supported: "lax", "strict", "none", null
    |
    */

    'same_site' => env('SESSION_SAME_SITE', 'lax'),

    /*
    |--------------------------------------------------------------------------
    | Partitioned Cookies
    |--------------------------------------------------------------------------
    |
    | Setting this value to true will tie the cookie to the top-level site for
    | a cross-site context. Partitioned cookies are accepted by the browser
    | when flagged "secure" and the Same-Site attribute is set to "none".
    |
    */

    'partitioned' => env('SESSION_PARTITIONED_COOKIE', false),

];
```

## database/migrations/0001_01_01_000000_create_users_table.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
```

## database/migrations/0001_01_01_000001_create_cache_table.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->integer('expiration');
        });

        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('owner');
            $table->integer('expiration');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cache');
        Schema::dropIfExists('cache_locks');
    }
};
```

## database/migrations/0001_01_01_000002_create_jobs_table.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('jobs', function (Blueprint $table) {
            $table->id();
            $table->string('queue')->index();
            $table->longText('payload');
            $table->unsignedTinyInteger('attempts');
            $table->unsignedInteger('reserved_at')->nullable();
            $table->unsignedInteger('available_at');
            $table->unsignedInteger('created_at');
        });

        Schema::create('job_batches', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->integer('total_jobs');
            $table->integer('pending_jobs');
            $table->integer('failed_jobs');
            $table->longText('failed_job_ids');
            $table->mediumText('options')->nullable();
            $table->integer('cancelled_at')->nullable();
            $table->integer('created_at');
            $table->integer('finished_at')->nullable();
        });

        Schema::create('failed_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->text('connection');
            $table->text('queue');
            $table->longText('payload');
            $table->longText('exception');
            $table->timestamp('failed_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('failed_jobs');
    }
};
```

## database/migrations/2025_09_10_030010_create_personal_access_tokens_table.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
```

## database/migrations/2025_09_10_034243_create_roles_table.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('roles', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name')->unique();       // superadmin, org_admin, contributor, public
            $table->string('scope')->nullable();    // system/tenant (optional)
            $table->timestampsTz();
        });
    }
    public function down(): void {
        Schema::dropIfExists('roles');
    }
};
```

## database/migrations/2025_09_10_034403_create_tenants_table.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('tenants', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name')->unique();
            $table->string('type')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->boolean('active')->default(true);
            $table->timestampsTz();
        });
    }
    public function down(): void {
        Schema::dropIfExists('tenants');
    }
};
```

## database/migrations/2025_09_10_034404_create_user_tenants_table.php

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('user_tenants', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('role_id')->constrained('roles');
            $table->timestampTz('joined_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
            $table->unique(['user_id','tenant_id','role_id']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('user_tenants');
    }
};
```

## database/migrations/2025_09_15_000001_update_layers_on_activate_stop_mirroring.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Keep/ensure one-active-per-body partial unique index (idempotent)
        DB::statement("
            CREATE UNIQUE INDEX IF NOT EXISTS uq_layers_active_per_body
            ON public.layers (body_type, body_id)
            WHERE is_active
        ");

        // Replace function: remove mirroring into lakes/watersheds
        DB::unprepared(<<<'SQL'
        CREATE OR REPLACE FUNCTION public.layers_on_activate()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW.is_active IS TRUE THEN
            UPDATE layers
               SET is_active = FALSE, updated_at = now()
             WHERE body_type = NEW.body_type
               AND body_id   = NEW.body_id
               AND id       <> NEW.id
               AND is_active = TRUE;
          END IF;

          RETURN NEW;
        END;
        $$;
        SQL);
    }

    public function down(): void
    {
        // Recreate the previous behavior (mirroring) ONLY if you truly want to rollback.
        DB::unprepared(<<<'SQL'
        CREATE OR REPLACE FUNCTION public.layers_on_activate()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW.is_active IS TRUE THEN
            UPDATE layers
               SET is_active = FALSE, updated_at = now()
             WHERE body_type = NEW.body_type
               AND body_id   = NEW.body_id
               AND id       <> NEW.id
               AND is_active = TRUE;

            IF NEW.body_type = 'lake' THEN
              UPDATE lakes SET geom = NEW.geom, updated_at = now()
               WHERE id = NEW.body_id;
            ELSIF NEW.body_type = 'watershed' THEN
              UPDATE watersheds SET geom = NEW.geom, updated_at = now()
               WHERE id = NEW.body_id;
            END IF;
          END IF;

          RETURN NEW;
        END;
        $$;
        SQL);
    }
};
```

## database/migrations/2025_09_15_000002_backfill_active_layers_from_lakes_geom.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Backfill base, public, active layers from lakes.geom where no active layer exists
        if (!Schema::hasColumn('lakes', 'geom')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        WITH missing AS (
          SELECT l.id AS lake_id
          FROM public.lakes l
          WHERE l.geom IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM public.layers x
              WHERE x.body_type = 'lake'
                AND x.body_id   = l.id
                AND x.is_active = TRUE
            )
        )
        INSERT INTO public.layers (
          body_type, body_id, uploaded_by,
          name, type, category, srid,
          visibility, is_active, status, version, notes, source_type,
          geom, created_at, updated_at
        )
        SELECT
          'lake'               AS body_type,
          l.id                 AS body_id,
          NULL                 AS uploaded_by,
          COALESCE(l.name, CONCAT('Lake #', l.id)) || ' – Base' AS name,
          'base'               AS type,
          NULL                 AS category,
          4326                 AS srid,
          'public'             AS visibility,
          TRUE                 AS is_active,
          'ready'              AS status,
          1                    AS version,
          'Backfilled from lakes.geom' AS notes,
          'geojson'            AS source_type,
          CASE
            WHEN ST_SRID(l.geom) = 4326 THEN ST_Multi(ST_CollectionExtract(ST_ForceCollection(ST_MakeValid(l.geom)), 3))
            ELSE ST_Transform(ST_Multi(ST_CollectionExtract(ST_ForceCollection(ST_MakeValid(l.geom)), 3)), 4326)
          END                  AS geom,
          now(), now()
        FROM public.lakes l
        JOIN missing m ON m.lake_id = l.id;
        SQL);
    }

    public function down(): void
    {
        // If you need to rollback, delete only the backfilled rows we just created
        DB::statement("
          DELETE FROM public.layers
          WHERE notes = 'Backfilled from lakes.geom'
        ");
    }
};
```

## database/migrations/2025_09_15_000003_drop_legacy_columns.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Drop columns that are no longer needed
        DB::statement("ALTER TABLE public.lakes  DROP COLUMN IF EXISTS geom");
        DB::statement("ALTER TABLE public.lakes  DROP COLUMN IF EXISTS max_depth_m");

        DB::statement("ALTER TABLE public.layers DROP COLUMN IF EXISTS file_hash");
        DB::statement("ALTER TABLE public.layers DROP COLUMN IF EXISTS file_size_bytes");
        DB::statement("ALTER TABLE public.layers DROP COLUMN IF EXISTS metadata");
    }

    public function down(): void
    {
        // Recreate columns if you need to rollback (types are typical; adjust if your schema differs)
        DB::statement("ALTER TABLE public.lakes  ADD COLUMN IF NOT EXISTS geom geometry(MultiPolygon, 4326)");
        DB::statement("ALTER TABLE public.lakes  ADD COLUMN IF NOT EXISTS max_depth_m double precision");

        DB::statement("ALTER TABLE public.layers ADD COLUMN IF NOT EXISTS file_hash text");
        DB::statement("ALTER TABLE public.layers ADD COLUMN IF NOT EXISTS file_size_bytes bigint");
        DB::statement("ALTER TABLE public.layers ADD COLUMN IF NOT EXISTS metadata jsonb");
    }
};
```

## database/migrations/2025_09_16_125041_create_email_otps_table.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('email_otps', function (Blueprint $t) {
            $t->id();
            $t->string('email')->index();
            $t->enum('purpose', ['register','reset'])->index();
            $t->string('code_hash', 64); // sha256 hex
            $t->timestamp('expires_at');
            $t->timestamp('last_sent_at');
            $t->unsignedTinyInteger('attempts')->default(0);
            $t->timestamp('consumed_at')->nullable();
            $t->json('payload')->nullable(); // for pending registration fields, if any
            $t->timestamps();
            $t->index(['email','purpose','expires_at']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('email_otps');
    }
};
```

## database/migrations/2025_09_17_202004_add_role_to_users_table.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('user')->after('email'); // default role
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
```

## database/migrations/2025_09_20_000001_align_tenants_table.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('tenants')) {
            return;
        }

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'slug')) {
                $table->string('slug')->nullable()->unique()->after('name');
            }
            if (!Schema::hasColumn('tenants', 'domain')) {
                $table->string('domain')->nullable()->unique()->after('slug');
            }
            if (!Schema::hasColumn('tenants', 'contact_email')) {
                $table->string('contact_email')->nullable()->after('domain');
            }
            if (!Schema::hasColumn('tenants', 'metadata')) {
                $table->jsonb('metadata')->nullable()->after('address');
            }
            if (!Schema::hasColumn('tenants', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        if (Schema::hasColumn('tenants', 'email')) {
            DB::statement("UPDATE tenants SET contact_email = email WHERE contact_email IS NULL");
            Schema::table('tenants', function (Blueprint $table) {
                $table->dropColumn('email');
            });
        }

        $tenants = DB::table('tenants')->select('id', 'name', 'slug')->orderBy('id')->get();
        $used = DB::table('tenants')
            ->whereNotNull('slug')
            ->pluck('slug')
            ->map(fn ($slug) => strtolower($slug))
            ->toArray();

        foreach ($tenants as $tenant) {
            if (!empty($tenant->slug)) {
                continue;
            }

            $base = Str::slug($tenant->name ?? '') ?: 'tenant-' . $tenant->id;
            $candidate = $base;
            $suffix = 1;
            while (in_array(strtolower($candidate), $used, true)) {
                $candidate = $base . '-' . $suffix;
                $suffix++;
            }

            DB::table('tenants')->where('id', $tenant->id)->update(['slug' => $candidate]);
            $used[] = strtolower($candidate);
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('tenants')) {
            return;
        }

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'email')) {
                $table->string('email')->nullable()->after('type');
            }
        });

        DB::statement("UPDATE tenants SET email = contact_email WHERE email IS NULL");

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'contact_email')) {
                $table->dropColumn('contact_email');
            }
            if (Schema::hasColumn('tenants', 'domain')) {
                $table->dropColumn('domain');
            }
            if (Schema::hasColumn('tenants', 'slug')) {
                $table->dropColumn('slug');
            }
            if (Schema::hasColumn('tenants', 'metadata')) {
                $table->dropColumn('metadata');
            }
            if (Schema::hasColumn('tenants', 'deleted_at')) {
                $table->dropColumn('deleted_at');
            }
        });
    }
};
```

## resources/css/base/globals.css

```css
/* resources/css/base/globals.css */

/* ====================================================================== */
/* 🌐 GLOBAL STYLES */
/* ====================================================================== */

/* ------------------------------- */
/* Global Reset & Typography */
:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ------------------------------- */
/* Body Layout */
body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
  overflow-x: hidden;  /* ✅ Prevents side panels from extending viewport */
  width: 100%;
  height: 100%;
}

/* ------------------------------- */
/* Headings */
h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

/* ------------------------------- */
/* Links */
a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

/* ------------------------------- */
/* Buttons (Default) */
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

/* ------------------------------- */
/* Light Theme Overrides */
@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
  a:hover {
    color: #747bff;
  }
  button {
    background-color: #f9f9f9;
  }
}
  /* ====================================================================== */
  /* 🪟 PANELS & UI OVERLAYS (Glass Style) */
  /* ====================================================================== */
  .glass-panel {
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    font-weight: 500;
    font-size: 13px;
    padding: 4px 8px;
  }
```

## resources/css/base/themes.css

```css
/* resources/css/base/themes.css */
/* ====================================================================== */
/* 🌗 MAP THEMES: Light vs Dark */
/* ====================================================================== */

/* ✅ Light maps */
.map-light .glass-panel { color: #222; }
.map-light .glass-panel .coords-icon,
.map-light .glass-panel .context-icon { color: #222; }
.map-light .scale-line { background: rgba(0,0,0,0.6); }
.map-light .scale-label { color: #222; }

/* ✅ Dark maps */
.map-dark .glass-panel { color: #fff; }
.map-dark .glass-panel .coords-icon,
.map-dark .glass-panel .context-icon { color: #fff; }
.map-dark .scale-line { background: rgba(255,255,255,0.9); }
.map-dark .scale-label { color: #fff; }
```

## resources/css/components/context-menu.css

```css
/* resources/css/components/context-menu.css */
/* ====================================================================== */
/* 📜 CONTEXT MENU */
/* ====================================================================== */
.context-menu {
  min-width: 150px;
  max-width: 180px;
  padding: 4px 0;
  margin: 0;
  list-style: none;
  z-index: 2000;
  pointer-events: auto !important;
}
.context-item {
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
  background: transparent !important;
  transition: background 0.2s, color 0.2s;
}
.context-icon {
  font-size: 14px;
  min-width: 14px;
  transition: color 0.2s ease;
}
.map-light .context-item:hover {
  background: rgba(0, 0, 0, 0.08) !important;
  color: #0077ff !important;
}
.map-light .context-item:hover .context-icon {
  color: #0077ff !important;
}
.map-dark .context-item:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #00e5ff !important;
}
.map-dark .context-item:hover .context-icon {
  color: #00e5ff !important;
}
```

## resources/css/components/coordinates-scale.css

```css
/* resources/css/components/coordinates-scale.css */
/* ====================================================================== */
/* 📏 COORDINATES SCALE */
/* ====================================================================== */
.coordinates-scale {
  position: absolute;
  bottom: 20px;
  left: 20px;
  padding: 6px 10px;
  z-index: 1000;
  cursor: pointer;
  user-select: none;
}
.coords-display {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.scale-bar { text-align: center; }
.scale-line {
  height: 3px;
  margin: 0 auto;
  transition: width 0.2s ease;
  border-radius: 2px;
}
.scale-label {
  font-size: 12px;
  margin-top: 2px;
  opacity: 0.9;
}
```

## resources/css/components/form.css

```css
/* resources/css/components/form.css */
/* ====================================================================== */
/* 🧪 TEST RESULTS FORM (Enhanced, Professional, Blank-Slate Friendly)    */
/* ====================================================================== */

/* --- Existing base card/typography (unchanged) --- */
.form-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}
.form-section-title {
  margin-top: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 6px;
}

/* --- Grid system (unchanged base) --- */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 12px 0;
}

/* depth rows (unchanged base) */
.form-grid.small-grid {
  grid-template-columns: 140px 1fr auto; /* depth | value | remove btn */
  gap: 12px;
  align-items: center;
}

/* --- Field base (unchanged) --- */
.form-card label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  display: block;
  margin-bottom: 4px;
}
.form-card input,
.form-card select,
.form-card textarea {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  outline: none;
  transition: border 0.2s, box-shadow 0.2s, background 0.2s;
  background: #fff;
  color: #111827;
}
.form-card input:focus,
.form-card select:focus,
.form-card textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}
.form-card textarea {
  min-height: 90px;
  resize: vertical;
}

/* --- Buttons (existing + refinements) --- */
.btn-add {
  margin-top: 6px;
  background: #f1f5f9;
  border: 1px solid #d1d5db;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s, box-shadow 0.2s, transform 0.05s;
}
.btn-add:hover { background: #e2e8f0; }
.btn-add:active { transform: translateY(1px); }

.btn-remove {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  cursor: pointer;
  font-size: 13px;
  background: #fef2f2;
  color: #b91c1c;
  transition: background 0.2s, box-shadow 0.2s, transform 0.05s;
}
.btn-remove:hover { background: #fee2e2; }
.btn-remove:active { transform: translateY(1px); }

.btn-primary {
  margin-top: 4px;
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: background 0.2s, box-shadow 0.2s, transform 0.05s;
}
.btn-primary:hover { background: #2563eb; }
.btn-primary:active { transform: translateY(1px); }

/* --- Subsection heading (unchanged) --- */
h4.subsection {
  margin-top: 12px;
  margin-bottom: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}
```

## resources/css/components/lake-info-panel.css

```css
/* resources/css/components/lake-info-panel.css */
/* ====================================================================== */
/* 🌊 LAKE INFO PANEL (Right Sidebar) */
/* ====================================================================== */
.lake-info-panel {
  position: fixed;
  top: 0;
  right: -340px;
  width: 340px;
  height: 100%;
  background: rgba(30, 60, 120, 0.65);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border-top-left-radius: 16px;
  border-bottom-left-radius: 16px;
  box-shadow: -2px 0 8px rgba(0,0,0,0.3);
  transition: right 0.35s ease, opacity 0.35s ease;
  z-index: 1300;
  display: flex;
  flex-direction: column;
  color: #fff;
  opacity: 0;
}
.lake-info-panel.open { right: 0; opacity: 1; }
.lake-info-panel.closing { right: -340px; opacity: 0; }
.lake-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.3);
}
.lake-info-title {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}
.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #fff;
  padding: 6px;
  border-radius: 6px;
  transition: background 0.2s;
}
.close-btn:hover { background: rgba(255,255,255,0.15); }
.lake-info-image { width: 100%; height: 180px; overflow: hidden; }
.lake-info-image img { width: 100%; height: 100%; object-fit: cover; }
.lake-info-content {
  padding: 16px;
  font-size: 14px;
  color: #f0f0f0;
  overflow-y: auto;
}
.lake-info-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.3); }
.lake-tab {
  flex: 1;
  padding: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #ddd;
  transition: background 0.2s, color 0.2s;
}
.lake-tab:hover { background: rgba(255,255,255,0.1); }
.lake-tab.active {
  background: rgba(255,255,255,0.2);
  color: #fff;
  font-weight: bold;
}
.insight-card {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 10px;
  padding: 10px 12px;
  margin-top: 10px;
  color: #fff;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
}
.insight-card h4 { margin: 0 0 6px 0; font-size: 14px; color: #ffeb3b; }
```

## resources/css/components/layer-control.css

```css
/* resources/css/components/layer-control.css */
/* ====================================================================== */
/* 🗂 LAYER CONTROL */
/* ====================================================================== */
.layer-control {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.layer-panel {
  position: absolute;
  top: 60px;
  right: 0;
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  width: 200px;
  border: 1px solid #ccc;
}

.layer-title {
  font-weight: bold;
  font-size: 14px;
  margin: 4px 0 8px 0;
  color: #000;
}

.layer-panel label {
  display: flex;
  align-items: center;
  font-size: 14px;
  margin: 6px 0;
  color: #000;
}

.layer-panel input[type="radio"] {
  margin-right: 8px;
  transform: scale(1.2);
}
```

## resources/css/components/map-controls.css

```css
/* resources/css/components/map-controls.css */

/* ====================================================================== */
/* 🎛 MAP CONTROLS */
/* ====================================================================== */

/* Floating Buttons (Unified Style) */
.btn-floating,
.icon-btn {
  background-color: #fff !important;
  border-radius: 50% !important;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}
.icon-layer {
  color: #439e9d;
  font-size: 22px;
  transition: color 0.2s ease;
}
.btn-floating:hover,
.icon-btn:hover {
  background-color: #f5f5f5 !important;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
}
.btn-floating:hover .icon-layer,
.icon-btn:hover .icon-layer {
  color: #2d6f6e;
}
.btn-floating:active,
.icon-btn:active {
  transform: scale(0.92);
}

/* Map Controls Position */
.map-controls {
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
}

/* ⚠ Global .btn-floating + .icon-layer overrides (keep order): */
.btn-floating {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #439e9d;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.btn-floating:hover {
  background: #367c7a;
}
.icon-layer {
  font-size: 20px; /* overrides earlier 22px */
}

/* Back to Dashboard rectangular button */
.map-back-btn {
  background: #ffffff;
  color: #439e9d;
  border: 1px solid #439e9d;
  border-radius: 10px;
  height: 42px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
.map-back-btn:hover {
  background: #f5f5f5;
}
```

## resources/css/components/modal.css

```css
/* LakeView modal components */

.lv-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45); /* slate-900 with opacity */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.lv-modal-card {
  background: #ffffff;
  color: #111827;               /* neutral dark */
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.25);
  overflow: hidden;
}

/* Variants for embedding custom UIs (like auth card) */
.lv-modal-card.no-bg {
  background: transparent;
  box-shadow: none;
}
.lv-modal-card.no-padding .lv-modal-body {
  padding: 0;
}

.lv-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb; /* gray-200 */
}

.lv-modal-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #111827;
}

.lv-modal-body {
  padding: 16px;
}

.lv-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #f1f5f9; /* slate-100 */
  background: #fafafa;
}

.lv-icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  line-height: 0;
  color: #6b7280;
}

.lv-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.lv-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lv-field > span {
  font-size: 0.85rem;
  color: #374151;
  font-weight: 600;
}

.lv-field input, .lv-field select, .lv-field textarea {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #111827;
}

@media (max-width: 720px) {
  .lv-grid-2 {
    grid-template-columns: 1fr;
  }
}
```

## resources/css/components/screenshot-button.css

```css
/* resources/css/components/screenshot-button.css */

/* places the screenshot FAB bottom-center */
.screenshot-btn {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}
```

## resources/css/components/search-bar.css

```css
/* resources/css/components/search-bar.css */

/* ====================================================================== */
/* 🔍 SEARCH BAR */
/* ====================================================================== */
.search-bar {
  position: absolute;
  top: 15px;
  left: 15px;
  display: flex;
  align-items: center;
  background: white;
  border-radius: 999px;
  padding: 4px 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  z-index: 1100;
}
.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #333;
  background: transparent;
  padding: 6px 8px;
  min-width: 160px;
}
.search-bar input::placeholder {
  color: #888;
}
.search-bar .btn-floating { /* scoped to .search-bar */
  width: 36px;
  height: 36px;
  margin-left: 6px;
  background: white;
  border: 1px solid #ccc;
  color: #439e9d;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}
.search-bar .btn-floating:hover {
  background: #f1f1f1;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.search-bar .icon-layer {
  font-size: 18px;
}
```

## resources/css/components/sidebar.css

```css
/* ====================================================================== */
/* 📂 SIDEBAR (LEFT) */
/* ====================================================================== */
.sidebar {
  position: fixed;
  top: 0;
  left: -260px;
  width: 260px;
  height: 100%;
  background: #fff;
  box-shadow: 2px 0 8px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  z-index: 1200;
  transition: left 0.3s ease;
  overflow-y: auto; /* allow dynamic scrolling when content exceeds viewport */
  border-top-right-radius: 16px;
  border-bottom-right-radius: 16px;
}
.sidebar.open { left: 0; }
.sidebar.pinned { left: 0 !important; }

/* Sidebar Header */
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sidebar-logo img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}
.sidebar-title {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #00695c;
}

/* Sidebar Buttons */
.sidebar-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #333;
  font-size: 18px;
  padding: 6px;
  border-radius: 6px;
  transition: background 0.2s, color 0.2s;
}
.sidebar-icon-btn:hover { background: rgba(0, 0, 0, 0.05); color: #00695c; }
.sidebar-icon-btn.active { background: #439e9d; color: #fff; }

/* Minimap */
.sidebar-minimap { width: 100%; border-bottom: 1px solid #ddd; }

/* Menu Items */
.sidebar-menu, .sidebar-bottom {
  list-style: none;
  margin: 0;
  padding: 0;
}
.sidebar-menu li, .sidebar-bottom li {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  color: #333;
  border-bottom: 1px solid #bbb;
  border-radius: 12px;   /* ✅ Rounded corners */
  margin: 4px 8px;       /* ✅ Adds spacing so corners are visible */
}
.sidebar-menu li:hover, .sidebar-bottom li:hover {
  background: #f5f5f5;
}
.sidebar-menu li:last-child, .sidebar-bottom li:last-child {
  border-bottom: none;
}

/* Sidebar Icons */
.sidebar-icon {
  font-size: 18px;
  color: #439e9d;
}

/* Bottom Section */
.sidebar-bottom {
  margin-top: auto;
  border-top: 1px solid #ddd;
}

/* Dynamic scrollbar styling (public sidebar) */
.sidebar {
  scrollbar-width: thin;            /* Firefox */
  scrollbar-color: #94a3b8 #f1f5f9; /* thumb track */
}
.sidebar::-webkit-scrollbar {
  width: 10px;
}
.sidebar::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 8px;
}
.sidebar::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 8px;
}

/* Make the whole row clickable for links/buttons */
.sidebar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-decoration: none;
  color: inherit;
  background: transparent;
  border: none;
  padding: 0;
  font: inherit;
  text-align: left;
}

/* Role badge next to user name */
.role-chip {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  line-height: 1;
  background: #e5e7eb; /* gray-200 */
  color: #111827;      /* gray-900 */
}

.role-superadmin { background: #fee2e2; color: #991b1b; }   /* red-ish */
.role-org_admin  { background: #dbeafe; color: #1e3a8a; }   /* blue-ish */
.role-contributor{ background: #ecfccb; color: #365314; }   /* green-ish */
.role-public     { background: #f3f4f6; color: #374151; }   /* neutral */
```

## resources/css/components/table.css

```css
/* ====================================================================== */
/* 🧱 TABLE WRAPPER + CORE                                                */
/* ====================================================================== */
.table-wrapper {
  width: 100%;
  max-width: 100%;
  overflow-x: visible; /* inner scroller handles X */
}

.lv-table-wrap { width: 100%; }
.lv-table-scroller {
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;     /* avoid inner vertical scrollbars */
  border-radius: 12px;
}

.lv-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;     /* enables width control / wrapping */
  background: #fff;
  border-radius: 12px;
}

/* Fallback styling for simple tables that only set .lv-table on <table> */
.lv-table thead th { background: #f8fafc; font-weight: 600; padding: 10px 12px; border-bottom: 1px solid #eef2f7; color: #111827; }
.lv-table tbody td { padding: 10px 12px; border-bottom: 1px solid #eef2f7; color: #111827; }

.lv-th, .lv-td {
  padding: 10px 12px;
  border-bottom: 1px solid #eef2f7;
  vertical-align: top;
  color: #111827;
  word-break: break-word;
  white-space: normal;
}

.lv-th {
  position: relative;
  background: #f8fafc;
  font-weight: 600;
  user-select: none;
}
.lv-th .lv-th-inner { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.lv-th .lv-th-label { overflow: hidden; text-overflow: ellipsis; }

.lv-resizer {
  flex: 0 0 auto;
  width: 8px;
  cursor: col-resize;
  align-self: stretch;
  margin-right: -6px;
  background: transparent;
}
.lv-resizer:hover { background: rgba(59,130,246,0.12); }

.lv-empty { padding: 28px 12px; text-align: center; color: #6b7280; }

/* Sticky actions column (icon-only actions) */
.sticky-right {
  position: sticky; right: 0;
  background: #fff;
  box-shadow: -6px 0 8px -6px rgba(0,0,0,0.06);
}

/* Inline action icons */
.lv-td-actions { padding-right: 8px; }
.lv-actions-inline { display: flex; gap: 8px; align-items: center; }
.icon-btn.simple {
  background: transparent; border: none; cursor: pointer;
  padding: 6px; border-radius: 8px; color: #6b7280; line-height: 0;
}
.icon-btn.simple:hover { background: #f3f4f6; color: #111827; }
.icon-btn.simple.danger:hover { background: #fee2e2; color: #b91c1c; }
.icon-btn.simple.accent:hover { background: #dcfce7; color: #166534; }

/* Pager */
.lv-table-pager {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 10px; padding: 10px 0 0;
}
.lv-table-pager .pager-text { color: #4b5563; }

/* ====================================================================== */
/* 🔧 COLUMN PICKER                                                       */
/* ====================================================================== */
.lv-colpick { position: relative; display: inline-block; }
.lv-colpick-menu {
  position: absolute; /* becomes fixed when portalToBody=true inline style */
  right: 0; top: 100%;
  width: 240px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.18);
  z-index: 5000;
}
.lv-colpick-title { font-weight: 700; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.lv-colpick-list { max-height: 260px; overflow: auto; padding: 8px 10px; display: grid; gap: 6px; }
.lv-colpick-item { display: flex; align-items: center; gap: 8px; font-size: 0.92rem; color: #111827; }
.lv-colpick-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 12px; border-top: 1px solid #f1f5f9; }

/* ====================================================================== */
/* 🔎 TOOLBAR                                                             */
/* ====================================================================== */
.org-toolbar {
  display: grid;
  grid-template-columns: 1fr auto auto auto;  /* search | potential small filters | ... | actions */
  gap: 10px;
  align-items: center;
}

.org-search,
.org-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  color: #374151;
}

.org-search { min-width: 0; }
.org-search input {
  background: transparent; border: 0; outline: 0; color: #111827;
  min-width: 0; width: 100%;
}

.org-filter { position: relative; }
.org-filter select {
  background: transparent; border: 0; outline: 0; color: #111827;
  min-width: 160px; border-radius: 8px; padding: 6px 28px 6px 8px;
  appearance: none; -webkit-appearance: none; -moz-appearance: none;
}
.org-filter::after {
  content: "▾"; position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: #6b7280;
}

.toolbar-icon { color: #6b7280; }

.org-actions-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

/* Pill buttons */
.pill-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; height: 36px; padding: 0 12px; border-radius: 999px;
  border: 1px solid #d1d5db; cursor: pointer;
  background: #ffffff; color: #374151;
  transition: background 140ms ease, border-color 140ms ease;
}
.pill-btn:hover { background: #f3f4f6; border-color: #9ca3af; }
.pill-btn.primary { background: #3b82f6; border-color: #2563eb; color: #fff; }
.pill-btn.primary:hover { background: #2563eb; }
@media (max-width: 480px) { .hide-sm { display: none; } }

/* ====================================================================== */
/* 🪫 EMPTY STATE                                                         */
/* ====================================================================== */
.no-data { text-align: center; padding: 28px 16px; color: #6b7280; }

/* ====================================================================== */
/* 📱 RESPONSIVE HELPERS                                                  */
/* ====================================================================== */
@media (max-width: 1024px) { .col-md-hide { display: none; } }
@media (max-width: 820px)  { .col-sm-hide { display: none; } }
@media (max-width: 560px)  { .col-xs-hide { display: none; } }

@media (max-width: 1024px) {
  .org-toolbar { grid-template-columns: 1fr auto; grid-auto-flow: row; }
}
@media (max-width: 820px) {
  .org-toolbar { grid-template-columns: 1fr; }
  .org-actions-right { justify-content: flex-start; }
}

/* ====================================================================== */
/* 🔽 ADVANCED FILTERS PANEL (below toolbar)                              */
/* ====================================================================== */
.advanced-filters {
  margin: 10px 0 6px 0;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  overflow: visible;              /* ensure poppers/inputs are visible */
}

.advanced-filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.advanced-filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); /* ← prevents overlap */
  align-items: start;              /* avoid overlap with tall controls */
  gap: 10px;
}

.af-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;                    /* ← prevent overflow in grid cell */
}
.af-field > span {
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
}
.af-field input,
.af-field select {
  width: 100%;                     /* ← keep inside the panel */
  max-width: 100%;
  padding: 9px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  box-sizing: border-box;          /* ← prevent “beyond bounds” */
}
.af-field select[multiple] {
  min-height: 36px;
}

.af-field.af-boolean {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.af-range {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
}
.af-range-sep { color: #6b7280; }

@media (max-width: 900px) {
  .advanced-filters-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
}
@media (max-width: 580px) {
  .advanced-filters-grid { grid-template-columns: 1fr; }
}
/* ===== Forms / Layers ===== */

.org-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  align-items: start;
}

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group input,
.form-group select,
.form-group textarea {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
  outline: 0;
  background: #fff;
  color: #111827;
  width: 100%;              /* never overflow the column */
}

/* BodySelect layout */
.form-group.bodyselect .bodyselect-search {
  width: 100%;
  margin-bottom: 8px;
}

.form-group.bodyselect .bs-fields {
  display: grid;
  grid-template-columns: 1fr 180px;  /* select | manual id */
  gap: 8px;
  align-items: end;
}

.form-group.bodyselect .bs-select { width: 100%; }

.form-group.bodyselect .bs-manual small {
  display: block; color: #6b7280; margin-bottom: 4px;
}
.form-group.bodyselect .bs-manual input {
  width: 100%; max-width: 180px;
}

/* Stack on narrow screens */
@media (max-width: 720px) {
  .form-group.bodyselect .bs-fields {
    grid-template-columns: 1fr;      /* select on top, manual below */
  }
  .form-group.bodyselect .bs-manual input { max-width: none; }
}
```

## resources/css/components/wizard.css

```css
.wizard-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  padding: 8px 4px 12px;
}
.wizard-step {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 10px;
  background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb;
  font-weight: 600;
}
.wizard-step .step-index {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  background: #e5e7eb; color: #111827; font-size: 0.8rem;
}
.wizard-step.active { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.wizard-step.active .step-index { background: #3b82f6; color: #fff; }
.wizard-step.done { background: #ecfdf5; border-color: #86efac; color: #15803d; }

.dropzone {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  color: #475569;
  cursor: pointer;
  background: #fff;
}
.dropzone:hover { background: #f8fafc; }

.file-list { margin-top: 12px; }
.file-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px;
  background: #fff; margin-bottom: 8px;
}
.file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.layer-list { list-style: none; margin: 0; padding: 0; }
.layer-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; margin-bottom: 8px;
}
.layer-name { font-weight: 600; margin-left: 8px; }
.layer-meta { color: #6b7280; font-size: 0.9rem; }

.info-row { display: inline-flex; align-items: center; gap: 8px; color: #374151; }
.alert-note {
  display: flex; align-items: center; gap: 8px;
  background: #fff7ed; color: #9a3412; border: 1px solid #fdba74;
  padding: 10px 12px; border-radius: 10px; margin-top: 12px;
}

.wizard-nav {
  display: flex; align-items: center; gap: 10px; margin-top: 12px;
}
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* Map preview container already uses inline styles; add this only if you prefer classes */
.map-preview {
  height: 360px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}
```

## resources/css/layouts/dashboard/_variables.css

```css

```

## resources/css/layouts/dashboard/card.css

```css
/* resources/css/dashboard/card.css */
/* ====================================================================== */
/* 🧾 DASHBOARD CARD (Neutral) */
/* ====================================================================== */
.dashboard-card {
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 3px 8px rgba(0,0,0,.06);
  padding: 16px;
}

.dashboard-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between; /* space for toolbars */
  gap: 12px;
  margin-bottom: 12px;
}

.dashboard-card-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: #111827;
}

.dashboard-card-body { padding-top: 4px; }

/* Logs (neutral) */
.recent-logs-list { list-style: none; margin: 0; padding: 0; }
.recent-log-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid #f3f4f6;
}
.recent-log-item:first-child { border-top: 0; }
.log-badge { font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 999px; white-space: nowrap; }
.log-approved { background: #ecfdf5; color: #16a34a; }
.log-rejected { background: #fef2f2; color: #dc2626; }
.log-uploaded { background: #eff6ff; color: #2563eb; }
.log-main { display: flex; flex-direction: column; gap: 4px; }
.log-detail { font-weight: 600; color: #111827; }
.log-meta { font-size: 12px; color: #6b7280; display: flex; gap: 6px; }
```

## resources/css/layouts/dashboard/dashboard-sidebar.css

```css
/* resources/css/dashboard/sidebar.css */
/* ====================================================================== */
/* 🧭 SIDEBAR (Dark) */
/* ====================================================================== */
.dashboard-sidebar {
  width: 260px;
  background: #1e293b;
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin: 16px;
  border-radius: 20px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  overflow: auto;
  transition: width 0.3s ease, transform 0.25s ease, box-shadow 0.25s ease;
  height: calc(100vh - 32px);
  position: relative; /* ✅ allow drawer toggle positioning */
}
.dashboard-sidebar:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

/* Sidebar: Logo */
.dashboard-logo {
  display: flex;
  align-items: center;
  padding: 20px;
}
.dashboard-logo img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  margin-right: 12px;
  transition: all 0.3s ease;
}
.dashboard-logo-text {
  white-space: nowrap;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* Drawer-style sidebar toggle */
.sidebar-toggle.drawer {
  position: absolute;
  top: 50%;
  right: -14px; /* like a handle outside */
  transform: translateY(-50%);
  background: #1e293b;
  border: 2px solid #fff;
  border-radius: 20px;   /* ✅ pill shape */
  width: 32px;
  height: 60px;          /* taller pill */
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  cursor: pointer;
  transition: background 0.2s ease, right 0.25s ease;
  z-index: 10;
}
.sidebar-toggle.drawer:hover {
  background: #334155;
}

/* Sidebar: Nav */
.dashboard-nav-links {
  list-style: none;
  padding: 0 12px;
  margin: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding-right: 6px;
}
/* Dynamic scrollbar styling (dashboard sidebar + nav) */
.dashboard-sidebar,
.dashboard-nav-links {
  scrollbar-width: thin;            /* Firefox */
  scrollbar-color: #475569 transparent; /* thumb track */
}
.dashboard-sidebar::-webkit-scrollbar,
.dashboard-nav-links::-webkit-scrollbar {
  width: 10px;
}
.dashboard-sidebar::-webkit-scrollbar-thumb,
.dashboard-nav-links::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 8px;
}
.dashboard-sidebar::-webkit-scrollbar-track,
.dashboard-nav-links::-webkit-scrollbar-track {
  background: transparent;
}
.dashboard-nav-links li a {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 14px 16px;
  color: #e2e8f0;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  border-radius: 10px;
  transition: all 0.25s ease;
  position: relative;
}
.dashboard-nav-links li a svg {
  flex-shrink: 0;
  font-size: 20px;
  margin-right: 12px;
  transition: font-size 0.25s ease, margin 0.25s ease;
}
.dashboard-nav-links li a:hover {
  background: #334155;
  color: #60a5fa;
}
.dashboard-nav-links li a.active {
  background: linear-gradient(90deg, #334155, #1e293b);
  color: #3b82f6;
  font-weight: 600;
}
.dashboard-nav-links li a.active::before {
  content: "";
  position: absolute;
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
  height: 60%;
  width: 4px;
  border-radius: 2px;
  background: #3b82f6;
}

/* Sidebar: User section */
.dashboard-user-section {
  flex-shrink: 0;
  border-top: 1px solid #334155;
  padding: 16px 20px;
  background: #1e293b;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dashboard-user-info,
.dashboard-signout {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}
.dashboard-user-info {
  color: #cbd5e1;
}
.dashboard-signout {
  cursor: pointer;
  color: #f87171;
  transition: all 0.25s ease;
  border-radius: 8px;
  padding: 8px 10px;
}
.dashboard-signout:hover {
  background: rgba(248, 113, 113, 0.1);
  color: #dc2626;
}

/* Collapsed */
.dashboard-sidebar.collapsed {
  width: 72px;
}
.dashboard-sidebar.collapsed .dashboard-logo {
  justify-content: center;
  padding: 16px 0;
}
.dashboard-sidebar.collapsed .dashboard-logo img {
  margin: 0;
  width: 40px;
  height: 40px;
}
.dashboard-sidebar.collapsed .dashboard-logo-text,
.dashboard-sidebar.collapsed .dashboard-user-info .user-name,
.dashboard-sidebar.collapsed .dashboard-signout .signout-text,
.dashboard-sidebar.collapsed .dashboard-nav-links li a .link-text {
  display: none !important;
}
.dashboard-sidebar.collapsed .dashboard-nav-links li a {
  justify-content: center;
  padding: 14px 0;
}
.dashboard-sidebar.collapsed .dashboard-nav-links li a svg {
  margin: 0;
  font-size: 22px;
}

/* Scrollbars (WebKit) */
.dashboard-nav-links::-webkit-scrollbar {
  width: 8px;
}
.dashboard-nav-links::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 8px;
}
.dashboard-nav-links::-webkit-scrollbar-track {
  background: transparent;
}

/* === Additional fixes (keep identical order & cascade) === */
/* === Logo fixes === */
.dashboard-logo img {
  width: 36px;          /* slightly smaller */
  height: 36px;
  object-fit: contain;  /* prevents distortion */
  margin-right: 12px;   /* spacing for expanded */
}
.dashboard-sidebar.collapsed .dashboard-logo {
  justify-content: center;
  padding: 16px 0;       /* balanced top/bottom */
}
.dashboard-sidebar.collapsed .dashboard-logo img {
  margin: 0;             /* remove side gap */
  width: 40px;           /* make it slightly bigger when centered */
  height: 40px;
}

/* === Toggle button fixes === */
.sidebar-toggle {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* === Nav icons centering === */
.dashboard-nav-links li a {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.dashboard-sidebar.collapsed .dashboard-nav-links li a {
  justify-content: center; /* center icons in collapsed mode */
  padding: 14px 0;
}
.dashboard-sidebar.collapsed .dashboard-nav-links li a svg {
  margin: 0;
  font-size: 22px; /* make icons a bit bigger */
}
```

## resources/css/layouts/dashboard/forms.css

```css
/* resources/css/dashboard/forms.css */
/* ====================================================================== */
/* 🧾 FORMS (Inside Dashboard) */
/* ====================================================================== */
.org-form {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-end;
  margin-top: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 200px;
}
.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}
.form-group input,
.form-group select {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  outline: none;
  background: #fff;
  color: #111827;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-group input:focus,
.form-group select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
}
```

## resources/css/layouts/dashboard/header.css

```css
/* resources/css/dashboard/header.css */
/* ====================================================================== */
/* 📌 PAGE HEADER (Light / Neutral) */
/* ====================================================================== */
.dashboard-page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}
.page-header-icon {
  font-size: 22px;
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.page-header-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}
.page-header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Header: circular icon button (e.g., map) */
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  transition: background 0.2s ease, transform 0.1s ease;
}
.btn-icon:hover { background: #2563eb; transform: translateY(-1px); }
```

## resources/css/layouts/dashboard/index.css

```css
/* resources/css/dashboard/index.css */
@import "./_variables.css";       /* optional placeholder; safe even if empty */
@import "./layout.css";
@import "./dashboard-sidebar.css";
@import "./header.css";
@import "./card.css";
@import "./kpi.css";
@import "./map.css";
@import "./forms.css";
@import "./tables-helpers.css";
@import "./responsive.css";
```

## resources/css/layouts/dashboard/kpi.css

```css
/* resources/css/dashboard/kpi.css */
/* ====================================================================== */
/* 📊 KPI CARDS (Neutral) */
/* ====================================================================== */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  gap: 14px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.kpi-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
}

.kpi-icon {
  font-size: 26px;
  color: #2563eb;                 /* primary blue */
  background: #eff6ff;            /* blue-50 */
  padding: 10px;
  border-radius: 12px;
}

.kpi-info { display: flex; flex-direction: column; }
.kpi-title {
  font-size: 13px;
  color: #6b7280;                 /* gray-500 */
  margin-bottom: 2px;
  font-weight: 600;
  letter-spacing: .01em;
}
.kpi-value { font-size: 22px; font-weight: 700; color: #111827; }
```

## resources/css/layouts/dashboard/layout.css

```css
/* resources/css/dashboard/layout.css */
/* ====================================================================== */
/* 🛠 LAYOUT BASICS */
/* ====================================================================== */
.dashboard-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  font-family: "Inter", Arial, sans-serif;
  background: #f9fafb; /* light gray background */
  color: #111827;      /* neutral dark text */
}

.dashboard-main {
  flex: 1;
  padding: 24px;
  background: #f9fafb;
  overflow-y: auto;
}

.dashboard-content {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease;
}
.dashboard-content:hover { transform: translateY(-1px); }
```

## resources/css/layouts/dashboard/map.css

```css
/* resources/css/dashboard/map.css */
/* ====================================================================== */
/* 🗺️ MAP CONTAINER */
/* ====================================================================== */
.map-container {
  height: 400px;  /* required for map to show */
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #f3f4f6;            /* light neutral */
  border: 1px solid #e5e7eb;
}
```

## resources/css/layouts/dashboard/responsive.css

```css
/* resources/css/dashboard/responsive.css */
/* ====================================================================== */
/* 📉 RESPONSIVE TWEAKS */
/* ====================================================================== */
@media (max-width: 960px) {
  .dashboard-main { padding: 16px; }
  .dashboard-content { padding: 16px; }
}
@media (max-width: 640px) {
  .dashboard-page-header { padding: 10px 12px; }
  .page-header-title { font-size: 18px; }
  .btn-icon { width: 34px; height: 34px; }
}
```

## resources/css/layouts/dashboard/tables-helpers.css

```css
/* resources/css/dashboard/tables-helpers.css */
/* (Optional) If you add a toolbar row inside card headers */
.dashboard-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* Make icon+label sit on one line in table headers */
.custom-table thead th .th-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  line-height: 1;           /* prevents vertical drift */
  vertical-align: middle;
}

/* Optional: normalize header height */
.custom-table thead th {
  height: 44px;             /* or whatever matches your row height */
}
```

## resources/css/layouts/auth.css

```css
/* resources/css/layouts/auth.css */
/* Full-page background */
.auth-page {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: "Arial", sans-serif;
  background: #ffffff;
}

/* Main card container (split layout) */
.auth-box {
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  color: #f1f5f9;
  border-radius: 20px;
  border: 1px solid #334155;
  width: 560px;
  max-width: 95%;
  min-height: 460px;
  display: flex;
  box-shadow: 0 20px 50px rgba(2, 6, 23, 0.5);
  overflow: hidden;
  position: relative;
}

/* Left side illustration */
.auth-illustration {
  flex: 1;
  background: url("/login-illustration.png") center center no-repeat;
  background-size: cover;
  display: none; /* hidden on mobile */
}

@media (min-width: 768px) {
  .auth-illustration {
    display: block;
  }
}

/* Right side form */
.auth-form {
  flex: 1;
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Brand row */
.auth-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}
.auth-brand img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}
.auth-brand span {
  font-weight: 700;
  color: #f8fafc;
}

/* Back to public link button */
.auth-back {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #334155;
  border-radius: 10px;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 12px;
}
.auth-back:hover {
  background: #334155;
  color: #e2e8f0;
}

.auth-back-row {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}

/* Headings */
.auth-form h2 {
  margin-bottom: 10px;
  font-size: 26px;
  font-weight: 800;
}

.auth-subtitle {
  font-size: 14px;
  margin-bottom: 24px;
  color: #cbd5e1;
}

/* Inputs */
.auth-form input,
.auth-form select {
  width: 100%;
  padding: 12px 14px;
  margin: 10px 0 0;
  border-radius: 12px;
  border: 1px solid #334155;
  background: rgba(15,23,42,0.6);
  outline: none;
  font-size: 14px;
  color: #e2e8f0;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.auth-form input::placeholder { color: #94a3b8; }
.auth-form input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.25);
  background: rgba(15,23,42,0.8);
}

/* Input adornments */
.auth-input-wrap { position: relative; }
.auth-input-wrap input { padding-right: 44px; }
.auth-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}
.auth-toggle:hover { color: #e2e8f0; }

.auth-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}

/* Checkbox */
.auth-checkbox {
  display: flex;
  align-items: center;
  font-size: 13px;
  margin: 10px 0;
  color: #e0e0e0;
  gap: 8px;
}

/* Buttons */
.auth-btn {
  width: 100%;
  height: 44px;
  padding: 12px;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  border: none;
  border-radius: 12px;
  margin-top: 18px;
  font-weight: 700;
  letter-spacing: .3px;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  transition: transform 0.08s ease, filter 0.2s ease;
}

.auth-btn:hover {
  filter: brightness(1.05);
}
.auth-btn:active {
  transform: translateY(1px);
}

.auth-btn-secondary {
  background: white;
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.14);
  width: auto; /* secondary is narrower in the OTP row */
  padding: 0 14px;
}

/* Links */
.auth-switch {
  margin-top: 20px;
  font-size: 13px;
  color: #cbd5e1;
}

.auth-link {
  color: #60a5fa;
  font-weight: 700;
  text-decoration: none;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 0;
}

.auth-link:hover {
  text-decoration: underline;
}

/* Forgot password */
.auth-forgot {
  text-align: right;
  font-size: 12px;
  color: #94a3b8;
  margin: 5px 0 10px;
  cursor: pointer;
}

.auth-forgot:hover {
  text-decoration: underline;
}

/* Error banner */
.auth-error {
  background: rgba(239, 68, 68, 0.15);
  color: #fecaca;
  border: 1px solid rgba(239, 68, 68, 0.35);
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 12px;
  font-size: 13px;
}

.auth-exit-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  border: none;
  background: transparent;
  color: #6b7280; /* gray-500 */
  transition: transform .2s;
  cursor: pointer;
}

.auth-exit-btn:hover {
  transform: scale(1.3);
}
.auth-exit-btn:active {
  transform: translateY(1px);
}

/* Role badge next to user name */
.role-chip {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  line-height: 1;
  background: #e5e7eb; /* gray-200 */
  color: #111827;      /* gray-900 */
}

.role-superadmin { background: #fee2e2; color: #991b1b; }   /* red-ish */
.role-org_admin  { background: #dbeafe; color: #1e3a8a; }   /* blue-ish */
.role-contributor{ background: #ecfccb; color: #365314; }   /* green-ish */
.role-public     { background: #f3f4f6; color: #374151; }   /* neutral */

.auth-remember {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0;
  font-size: 0.9rem;
  color: #8ba3ca; /* gray-700 */
}

.auth-remember input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
}

.auth-inline {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}

.auth-row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  align-items: center;
}

.auth-otp-input {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255,255,255,0.95);
  padding: 0 12px;
  font-size: 16px;
  letter-spacing: 2px;
}
```

## resources/css/app.css

```css
/* resources/css/app.css */

/* Tailwind (keep exactly as you had it) */
@import 'tailwindcss';

@source '../../vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php';
@source '../../storage/framework/views/*.php';
@source '../**/*.blade.php';
@source '../**/*.js';

@theme {
  --font-sans: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji',
  'Segoe UI Emoji','Segoe UI Symbol', 'Noto Color Emoji';
}

/* === Modular CSS (empty stubs at first — safe to import) === */
/* Base */
@import './base/globals.css';
@import './base/themes.css';

/* Layouts */
@import './layouts/auth.css';
@import "./layouts/dashboard/index.css";

/* Components
   NOTE: Keep this order. `screenshot-button.css` is before `map-controls.css`
   because `map-controls.css` contains global .btn-floating overrides that
   should come after the screenshot button rules, just like in your original file. */
@import './components/search-bar.css';
@import './components/screenshot-button.css';
@import './components/map-controls.css';
@import './components/layer-control.css';
@import './components/context-menu.css';
@import './components/coordinates-scale.css';
@import './components/sidebar.css';
@import './components/lake-info-panel.css';
@import './components/table.css';
@import './components/form.css';
@import './components/wizard.css';
@import "./components/modal.css";


/* Pages */
```

## resources/js/components/layers/LayerList.jsx

```jsx
import React, { useEffect, useRef, useState } from "react";
import {
  FiLayers, FiLoader, FiEye, FiToggleRight, FiLock, FiUnlock, FiTrash2, FiEdit2,
} from "react-icons/fi";

import Modal from "../Modal";
import {
  fetchLayersForBody,
  // activateLayer,  // no longer used
  toggleLayerVisibility,
  deleteLayer,
  fetchBodyName,
  updateLayer,
  fetchLakeOptions,
  fetchWatershedOptions,
} from "../../lib/layers";
import AppMap from "../../components/AppMap";
import { GeoJSON } from "react-leaflet";
import L from "leaflet";

function LayerList({
  initialBodyType = "lake",
  initialBodyId = "",
  allowActivate = true,
  allowToggleVisibility = true,
  allowDelete = true,
  showPreview = false,
  onPreview,
}) {
  const [bodyType, setBodyType] = useState(initialBodyType);
  const [bodyId, setBodyId] = useState(initialBodyId);
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [bodyName, setBodyName] = useState("");
  const [lakeOptions, setLakeOptions] = useState([]);
  const [watershedOptions, setWatershedOptions] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", category: "", notes: "", visibility: "public" });
  const [previewLayer, setPreviewLayer] = useState(null);
  const previewMapRef = useRef(null);

  const refresh = async () => {
    if (!bodyType || !bodyId) {
      setLayers([]);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const rows = await fetchLayersForBody(bodyType, bodyId);
      setLayers(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error('[LayerList] Failed to fetch layers', e);
      setErr(e?.message || "Failed to fetch layers");
      setLayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyType, bodyId]);

  useEffect(() => {
    (async () => {
      const n = await fetchBodyName(bodyType, bodyId);
      setBodyName(n || "");
    })();
  }, [bodyType, bodyId]);

  // Load lake options (names only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (bodyType !== "lake") return;
      try {
        const rows = await fetchLakeOptions("");
        if (!cancelled) setLakeOptions(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setLakeOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [bodyType]);

  // Load watershed options (names only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (bodyType !== "watershed") return;
      try {
        const rows = await fetchWatershedOptions("");
        if (!cancelled) setWatershedOptions(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setWatershedOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [bodyType]);

  // Fit preview bounds when map or selection changes
  useEffect(() => {
    const map = previewMapRef.current;
    if (!map || !previewLayer) return;
    try {
      const gj = previewLayer.geom_geojson ? JSON.parse(previewLayer.geom_geojson) : null;
      if (!gj) return;
      const layer = L.geoJSON(gj);
      const b = layer.getBounds();
      if (b && b.isValid && b.isValid()) map.fitBounds(b.pad(0.1));
    } catch (_) {}
  }, [previewLayer]);

  const doToggleVisibility = async (row) => {
    try {
      await toggleLayerVisibility(row);
      await refresh();
    } catch (e) {
      console.error('[LayerList] Toggle visibility failed', e);
      alert(e?.message || "Failed to toggle visibility");
    }
  };

  const doDelete = async (id) => {
    if (!confirm("Delete this layer? This cannot be undone.")) return;
    try {
      await deleteLayer(id);
      await refresh();
    } catch (e) {
      console.error('[LayerList] Delete failed', e);
      alert(e?.message || "Failed to delete layer");
    }
  };

  // NEW: default toggle with “one-at-a-time” guard (no auto-unset others)
  const doToggleDefault = async (row) => {
    try {
      if (row.is_active) {
        // Turn OFF current default
        await updateLayer(row.id, { is_active: false });
        await refresh();
        return;
      }
      // Trying to turn ON -> block if another layer is already default
      const existing = layers.find((l) => l.is_active && l.id !== row.id);
      if (existing) {
        alert(
          `“${existing.name}” is already set as the default layer.\n\n` +
          `Please turn it OFF first, then set “${row.name}” as the default.`
        );
        return;
      }
      await updateLayer(row.id, { is_active: true });
      await refresh();
    } catch (e) {
      console.error('[LayerList] Toggle default failed', e);
      alert(e?.message || "Failed to toggle default");
    }
  };

  return (
    <>
      <div className="dashboard-card" style={{ marginTop: 16 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiLayers />
            <span>Layers for {bodyName || (bodyId ? "..." : "-")}</span>
          </div>
          <div className="org-actions-right">
            <button
              className="pill-btn ghost"
              onClick={refresh}
              title="Refresh"
              aria-label="Refresh"
            >
              {loading ? <FiLoader className="spin" /> : "Refresh"}
            </button>
          </div>
        </div>

        {/* Body selector row */}
        <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
          <div className="org-form" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label>Body Type</label>
              <select
                value={bodyType}
                onChange={(e) => {
                  setBodyType(e.target.value);
                  setBodyId("");
                }}
              >
                <option value="lake">Lake</option>
                <option value="watershed">Watershed</option>
              </select>
            </div>

            {bodyType === "lake" ? (
              <div className="form-group" style={{ minWidth: 260 }}>
                <label>Select Lake</label>
                <select
                  value={bodyId}
                  onChange={(e) => setBodyId(e.target.value)}
                  required
                >
                  <option value="" disabled>Choose a lake</option>
                  {lakeOptions.map((o) => (
                    <option key={`lake-${o.id}`} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group" style={{ minWidth: 260 }}>
                <label>Select Watershed</label>
                <select
                  value={bodyId}
                  onChange={(e) => setBodyId(e.target.value)}
                  required
                >
                  <option value="" disabled>Choose a watershed</option>
                  {watershedOptions.map((o) => (
                    <option key={`ws-${o.id}`} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Inline preview map (optional) */}
          {previewLayer && previewLayer.geom_geojson && (
            <div style={{ height: 360, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: 12 }}>
              <AppMap view="osm" whenCreated={(m) => (previewMapRef.current = m)}>
                <GeoJSON
                  key={`gj-${previewLayer.id}`}
                  data={JSON.parse(previewLayer.geom_geojson)}
                  style={{ weight: 2, fillOpacity: 0.1 }}
                />
              </AppMap>
            </div>
          )}

          {err && (
            <div className="alert-note" style={{ marginBottom: 8 }}>
              {err}
            </div>
          )}

          {!layers.length ? (
            <div className="no-data">
              {bodyId ? "No layers found for this body." : "Select a lake or watershed to view layers."}
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="lv-table">
                <thead>
                  <tr>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Name</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Category</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Visibility</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Default Layer</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Created by</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Area (km2)</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Updated</span></div></th>
                    <th className="lv-th lv-th-actions sticky-right"><div className="lv-th-inner"><span className="lv-th-label">Actions</span></div></th>
                  </tr>
                </thead>
                <tbody>
                  {layers.map((row) => (
                    <tr key={row.id}>
                      <td className="lv-td">{row.name}</td>
                      <td className="lv-td">{row.category || '-'}</td>
                      <td className="lv-td">{row.visibility === "public" ? "Public" : "Admin"}</td>
                      <td className="lv-td">{row.is_active ? "Yes" : "No"}</td>
                      <td className="lv-td">{row.uploaded_by_name || '-'}</td>
                      <td className="lv-td">{row.area_km2 ?? "-"}</td>
                      <td className="lv-td">{row.updated_at ? new Date(row.updated_at).toLocaleString() : "-"}</td>
                      <td className="lv-td sticky-right lv-td-actions">
                        <div className="lv-actions-inline">
                          <button
                            className="icon-btn simple"
                            title="View on map"
                            aria-label="View"
                            onClick={() => setPreviewLayer(row)}
                          >
                            <FiEye />
                          </button>

                          <button
                            className="icon-btn simple"
                            title="Edit metadata"
                            aria-label="Edit"
                            onClick={() => {
                              setEditRow(row);
                              setEditForm({
                                name: row.name || "",
                                category: row.category || "",
                                notes: row.notes || "",
                                visibility: row.visibility || "public",
                              });
                              setEditOpen(true);
                            }}
                          >
                            <FiEdit2 />
                          </button>

                          {allowActivate && (
                            <button
                              className={`icon-btn simple ${row.is_active ? "accent" : ""}`}
                              title={row.is_active ? "Unset Default" : "Set as Default"}
                              aria-label={row.is_active ? "Unset Default" : "Set as Default"}
                              onClick={() => doToggleDefault(row)}
                            >
                              <FiToggleRight />
                            </button>
                          )}

                          {allowToggleVisibility && (
                            <button
                              className="icon-btn simple"
                              title={row.visibility === "public" ? "Make Admin-only" : "Make Public"}
                              aria-label="Toggle Visibility"
                              onClick={() => doToggleVisibility(row)}
                            >
                              {row.visibility === "public" ? <FiLock /> : <FiUnlock />}
                            </button>
                          )}

                          {allowDelete && (
                            <button
                              className="icon-btn simple danger"
                              title="Delete"
                              aria-label="Delete"
                              onClick={() => doDelete(row.id)}
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <style>{`
          .spin { animation: spin 1.2s linear infinite; }
          @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        `}</style>
      </div>

      {editOpen && (
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Layer Metadata"
          width={640}
          ariaLabel="Edit Layer"
          footer={
            <div className="lv-modal-actions">
              <button className="pill-btn ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              <button
                className="pill-btn primary"
                onClick={async () => {
                  try {
                    await updateLayer(editRow.id, {
                      name: editForm.name,
                      category: editForm.category || null,
                      notes: editForm.notes || null,
                      visibility: editForm.visibility,
                    });
                    setEditOpen(false);
                    await refresh();
                  } catch (e) {
                    console.error('[LayerList] Update layer failed', e);
                    alert(e?.message || 'Failed to update layer');
                  }
                }}
              >
                Save Changes
              </button>
            </div>
          }
        >
          <div className="org-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                value={editForm.category}
                onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g., Hydrology"
              />
            </div>
            <div className="form-group" style={{ flexBasis: '100%' }}>
              <label>Notes</label>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Short description / source credits"
              />
            </div>
            <div className="form-group">
              <label>Visibility</label>
              <select
                value={editForm.visibility}
                onChange={(e) => setEditForm((f) => ({ ...f, visibility: e.target.value }))}
              >
                <option value="public">Public</option>
                <option value="admin">Admin only</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default LayerList;
```

## resources/js/components/layers/LayerWizard.jsx

```jsx
import React, { useEffect, useRef, useState } from "react";
import { GeoJSON } from "react-leaflet";
import AppMap from "../../components/AppMap";
import "leaflet/dist/leaflet.css";
import {
  FiUploadCloud, FiCheckCircle, FiMap, FiGlobe, FiAlertTriangle, FiInfo,
} from "react-icons/fi";

import Wizard from "../../components/Wizard";
// BodySelect removed to keep the UX uniform (dropdown for both)

import {
  boundsFromGeom,
  normalizeForPreview,
  reprojectMultiPolygonTo4326,
} from "../../utils/geo";

import { createLayer, fetchLakeOptions, fetchWatershedOptions } from "../../lib/layers";

export default function LayerWizard({
  defaultBodyType = "lake",
  defaultVisibility = "public",
  allowSetActive = true,
  // Reusability knobs (kept for compatibility, but both types use dropdowns now)
  allowedBodyTypes = ["lake", "watershed"],
  selectionModeLake = "dropdown",
  selectionModeWatershed = "dropdown",
  onPublished,             // (layerResponse) => void
}) {
  const [data, setData] = useState({
    // file/geom
    fileName: "",
    geomText: "",
    uploadGeom: null,       // original MultiPolygon (source SRID)
    previewGeom: null,      // WGS84 for map preview
    sourceSrid: 4326,

    // link
    bodyType: allowedBodyTypes.includes(defaultBodyType) ? defaultBodyType : allowedBodyTypes[0] || "lake",
    bodyId: "",

    // meta
    name: "",
    category: "",
    notes: "",
    visibility: defaultVisibility, // 'admin' | 'public'
    isActive: false,
  });

  const [error, setError] = useState("");
  const mapRef = useRef(null);
  const [lakeOptions, setLakeOptions] = useState([]);
  const [watershedOptions, setWatershedOptions] = useState([]);

  // fit map when preview changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data.previewGeom) return;
    const b = boundsFromGeom(data.previewGeom);
    if (b && b.isValid()) map.fitBounds(b.pad(0.2));
  }, [data.previewGeom]);

  // Load lake options (names only) when selecting a lake
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (data.bodyType !== "lake") return;
      try {
        const rows = await fetchLakeOptions("");
        if (!cancelled) setLakeOptions(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error('[LayerWizard] Failed to load lake options', e);
        if (!cancelled) setLakeOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [data.bodyType]);

  // Load watershed options (names only) when selecting a watershed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (data.bodyType !== "watershed") return;
      try {
        const rows = await fetchWatershedOptions("");
        if (!cancelled) setWatershedOptions(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error('[LayerWizard] Failed to load watershed options', e);
        if (!cancelled) setWatershedOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [data.bodyType]);

  const worldBounds = [
    [4.6, 116.4],
    [21.1, 126.6],
  ];

  // -------- file handlers ----------
  const acceptedExt = /\.(geojson|json)$/i;

  const handleParsedGeoJSON = (parsed, fileName = "") => {
    const { uploadGeom, previewGeom, sourceSrid } = normalizeForPreview(parsed);
    setData((d) => ({
      ...d,
      uploadGeom,
      previewGeom,
      sourceSrid,
      geomText: JSON.stringify(parsed, null, 2),
      fileName,
    }));
    setError("");
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!acceptedExt.test(file.name)) {
      setError("Only .geojson or .json files are supported.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      handleParsedGeoJSON(parsed, file.name);
    } catch (e) {
      console.error('[LayerWizard] Failed to parse GeoJSON file', e);
      setError(e?.message || "Failed to parse GeoJSON file.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files || [])];
    const f = files.find((ff) => acceptedExt.test(ff.name));
    if (f) handleFile(f);
  };

  // -------- manual SRID change (recompute preview from original) ----------
  const updateSourceSrid = (srid) => {
    const s = Number(srid) || 4326;
    if (!data.uploadGeom) {
      setData((d) => ({ ...d, sourceSrid: s }));
      return;
    }
    const preview =
      s === 4326 ? data.uploadGeom : reprojectMultiPolygonTo4326(data.uploadGeom, s);
    setData((d) => ({ ...d, sourceSrid: s, previewGeom: preview }));
  };

  // -------- publish ----------
  const onPublish = async () => {
    setError("");
    try {
      if (!data.uploadGeom) throw new Error("Please upload or paste a valid Polygon/MultiPolygon GeoJSON first.");
      if (!data.bodyType || !data.bodyId) throw new Error("Select a target (lake or watershed) and its ID.");
      if (!data.name) throw new Error("Layer name is required.");

      const payload = {
        body_type: data.bodyType,
        body_id: Number(data.bodyId),
        name: data.name,
        type: "base",
        category: data.category,
        srid: Number(data.sourceSrid) || 4326,
        visibility: data.visibility,          // 'admin' | 'public'
        is_active: !!data.isActive,
        status: "ready",
        notes: data.notes || null,
        source_type: "geojson",
        geom_geojson: JSON.stringify(data.uploadGeom),
      };

      const res = await createLayer(payload);
      if (typeof onPublished === "function") onPublished(res);

      alert("Layer created successfully.");
    } catch (e) {
      console.error('[LayerWizard] Publish failed', e);
      setError(e?.message || "Failed to publish layer.");
    }
  };

  // -------- steps ----------
  const steps = [
    // Step 1: Upload / Paste
    {
      key: "upload",
      title: "Upload / Paste GeoJSON",
      render: () => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiUploadCloud />
              <span>Upload or Paste</span>
            </div>
          </div>

          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("layer-file-input")?.click()}
          >
            <p>Drop a GeoJSON file here or click to select</p>
            <small>Accepted: .geojson, .json (Polygon / MultiPolygon, or Feature/FeatureCollection of polygons)</small>
            <input
              id="layer-file-input"
              type="file"
              accept=".geojson,.json"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <div className="org-form" style={{ marginTop: 12 }}>
            <div className="form-group" style={{ flexBasis: "100%" }}>
              <label>Or paste GeoJSON</label>
              <textarea
                rows={8}
                value={data.geomText}
                onChange={(e) => {
                  const text = e.target.value;
                  setData((d) => ({ ...d, geomText: text }));
                  try {
                    const parsed = JSON.parse(text);
                    handleParsedGeoJSON(parsed, "");
                  } catch {
                    // keep as user types
                  }
                }}
                placeholder='e.g. {"type":"Polygon","coordinates":[...]} or a Feature/FeatureCollection of polygons'
              />
            </div>
          </div>

          {error && (
            <div className="alert-note" style={{ marginTop: 8 }}>
              <FiAlertTriangle /> {error}
            </div>
          )}
          {data.fileName && (
            <div className="info-row" style={{ marginTop: 6 }}>
              <FiInfo /> Loaded: <strong>{data.fileName}</strong>
            </div>
          )}
        </div>
      ),
    },

    // Step 2: Preview & CRS
    {
      key: "preview",
      title: "Preview & CRS",
      render: () => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiCheckCircle />
              <span>Preview & Coordinate System</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="info-row" style={{ marginBottom: 8 }}>
              <FiInfo /> The map shows a <strong>WGS84 (EPSG:4326)</strong> preview. Your original geometry will be saved with the detected/selected SRID.
            </div>
            <div style={{ height: 420, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
              <AppMap
                view="osm"
                style={{ height: "100%", width: "100%" }}
                whenCreated={(m) => { if (m && !mapRef.current) mapRef.current = m; }}
              >
                {data.previewGeom && (
                  <GeoJSON key="geom" data={{ type: "Feature", geometry: data.previewGeom }} />
                )}
              </AppMap>
            </div>

            <div className="org-form" style={{ marginTop: 10 }}>
              <div className="form-group">
                <label>Detected/Source SRID</label>
                <input
                  type="number"
                  value={data.sourceSrid}
                  onChange={(e) => updateSourceSrid(e.target.value)}
                  placeholder="e.g., 4326 or 32651"
                />
              </div>
              <div className="alert-note">
                <FiAlertTriangle /> If the file declares a CRS e.g., EPSG::32651 or CRS84,
                it’s auto-detected. Adjust only if detection was wrong.
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Step 3: Link to Body (UNIFIED: dropdown for both Lake & Watershed)
    {
      key: "link",
      title: "Link to Body",
      render: () => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiMap />
              <span>Link to a {data.bodyType === "lake" ? "Lake" : "Watershed"}</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              {allowedBodyTypes.length > 1 && (
                <div className="form-group">
                  <label>Body Type</label>
                  <select
                    value={data.bodyType}
                    onChange={(e) =>
                      setData((d) => ({ ...d, bodyType: e.target.value, bodyId: "" }))
                    }
                  >
                    {allowedBodyTypes.includes("lake") && (<option value="lake">Lake</option>)}
                    {allowedBodyTypes.includes("watershed") && (<option value="watershed">Watershed</option>)}
                  </select>
                </div>
              )}

              {data.bodyType === "lake" ? (
                <div className="form-group" style={{ minWidth: 260 }}>
                  <label>Select Lake</label>
                  <select
                    value={data.bodyId}
                    onChange={(e) => setData((d) => ({ ...d, bodyId: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Choose a lake</option>
                    {lakeOptions.map((o) => (
                      <option key={`lake-${o.id}`} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group" style={{ minWidth: 260 }}>
                  <label>Select Watershed</label>
                  <select
                    value={data.bodyId}
                    onChange={(e) => setData((d) => ({ ...d, bodyId: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select category…</option>
                    {watershedOptions.map((o) => (
                      <option key={`ws-${o.id}`} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },

    // Step 4: Metadata
    {
      key: "meta",
      title: "Metadata",
      render: () => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiGlobe />
              <span>Metadata</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              <div className="form-group">
                <label>Layer Name</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g., Official shoreline 2024"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={data.category}
                  onChange={(e) => setData((d) => ({ ...d, category: e.target.value }))}
                >
                  <option value="" disabled>Select category…</option>
                  <option value="Profile">Profile</option>
                  <option value="Boundary">Boundary</option>
                  <option value="Bathymetry">Bathymetry</option>
                </select>
              </div>

              <div className="form-group" style={{ flexBasis: "100%" }}>
                <label>Notes</label>
                <input
                  type="text"
                  value={data.notes}
                  onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="Short description / source credits"
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Step 5: Publish & Visibility
    {
      key: "publish",
      title: "Publish",
      render: () => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiGlobe />
              <span>Publish</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              <div className="form-group">
                <label>Visibility</label>
                <select
                  value={data.visibility}
                  onChange={(e) => setData((d) => ({ ...d, visibility: e.target.value }))}
                >
                  <option value="public">Public</option>
                  <option value="admin">Admin only</option>
                </select>
              </div>

              {allowSetActive && (
                <div className="form-group">
                  <label>Default Layer</label>
                  <div>
                    <button
                      type="button"
                      className={`pill-btn ${data.isActive ? 'primary' : 'ghost'}`}
                      onClick={() => setData((d) => ({ ...d, isActive: !d.isActive }))}
                      title="Toggle default layer"
                    >
                      {data.isActive ? 'Default Enabled' : 'Set as Default'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {error && (
              <div className="alert-note" style={{ marginTop: 8 }}>
                <FiAlertTriangle /> {error}
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <Wizard
      steps={steps}
      initialData={data}
      labels={{ back: "Back", next: "Next", finish: "Publish" }}
      onFinish={onPublish}
      onChange={(payload) => setData((d) => ({ ...d, ...payload }))}
    />
  );
}
```

## resources/js/components/table/ColumnPicker.jsx

```jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * ColumnPicker with optional portal-to-body popover
 *
 * Props:
 * - columns: [{ id, header }]
 * - visible: { [id]: boolean }
 * - onChange: (map) => void
 * - triggerRender: (openFn, buttonRef) => ReactNode
 * - portalToBody?: boolean
 */
export default function ColumnPicker({
  columns,
  visible,
  onChange,
  triggerRender,
  portalToBody = false,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const openMenu = () => {
    setOpen(true);
    if (portalToBody && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.right - 240 }); // 240px ~ menu width
    }
  };
  const close = () => setOpen(false);

  // Outside click
  useEffect(() => {
    const h = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target) && !btnRef.current?.contains(e.target)) close();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ESC to close
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const menu = (
    <div
      ref={menuRef}
      className="lv-colpick-menu"
      style={portalToBody ? { position: "fixed", top: pos.top, left: pos.left, zIndex: 5000 } : undefined}
      role="dialog"
      aria-label="Columns"
    >
      <div className="lv-colpick-title">Columns</div>
      <div className="lv-colpick-list">
        {columns.map((c) => (
          <label key={c.id} className="lv-colpick-item">
            <input
              type="checkbox"
              checked={visible[c.id] !== false}
              onChange={() => onChange({ ...visible, [c.id]: !visible[c.id] })}
            />
            <span>{typeof c.header === "string" ? c.header : c.id}</span>
          </label>
        ))}
      </div>
      <div className="lv-colpick-actions">
        <button className="pill-btn ghost sm" onClick={close}>Close</button>
      </div>
    </div>
  );

  return (
    <div className="lv-colpick">
      {triggerRender ? triggerRender(openMenu, btnRef) : <button ref={btnRef} onClick={openMenu}>Columns</button>}
      {open && (portalToBody ? createPortal(menu, document.body) : menu)}
    </div>
  );
}
```

## resources/js/components/table/FilterPanel.jsx

```jsx
import React from "react";

/**
 * Collapsible "Advanced Filters" panel
 *
 * Props:
 * - open: boolean
 * - fields: [
 *     { id, label, type: 'text'|'select'|'multiselect'|'number-range'|'date-range'|'boolean',
 *       value, onChange, options? }
 *   ]
 * - onClearAll?: () => void
 */
export default function FilterPanel({ open, fields = [], onClearAll }) {
  if (!open) return null;

  return (
    <div className="advanced-filters" role="region" aria-label="Advanced filters">
      <div className="advanced-filters-header">
        <strong>Filters</strong>
        {onClearAll && (
          <button className="pill-btn ghost sm" onClick={onClearAll} aria-label="Clear filters">
            Clear all
          </button>
        )}
      </div>

      <div className="advanced-filters-grid">
        {fields.map((f) => {
          if (f.type === "text") {
            return (
              <label key={f.id} className="af-field">
                <span>{f.label}</span>
                <input type="text" value={f.value || ""} onChange={(e) => f.onChange?.(e.target.value)} />
              </label>
            );
          }

          if (f.type === "select") {
            return (
              <label key={f.id} className="af-field">
                <span>{f.label}</span>
                <select value={f.value ?? ""} onChange={(e) => f.onChange?.(e.target.value)}>
                  {(f.options || []).map((opt) => (
                    <option key={opt.value ?? opt} value={opt.value ?? opt}>
                      {opt.label ?? opt}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          if (f.type === "multiselect") {
            return (
              <label key={f.id} className="af-field">
                <span>{f.label}</span>
                <select
                  multiple
                  value={Array.isArray(f.value) ? f.value : []}
                  onChange={(e) => {
                    const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                    f.onChange?.(vals);
                  }}
                >
                  {(f.options || []).map((opt) => (
                    <option key={opt.value ?? opt} value={opt.value ?? opt}>
                      {opt.label ?? opt}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          if (f.type === "number-range") {
            const [min, max] = Array.isArray(f.value) ? f.value : [null, null];
            return (
              <div key={f.id} className="af-field">
                <span>{f.label}</span>
                <div className="af-range">
                  <input
                    type="number"
                    step="any"
                    placeholder="Min"
                    value={min ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      f.onChange?.([v, max]);
                    }}
                  />
                  <span className="af-range-sep">–</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Max"
                    value={max ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      f.onChange?.([min, v]);
                    }}
                  />
                </div>
              </div>
            );
          }

          if (f.type === "date-range") {
            const [from, to] = Array.isArray(f.value) ? f.value : [null, null];
            return (
              <div key={f.id} className="af-field">
                <span>{f.label}</span>
                <div className="af-range">
                  <input
                    type="date"
                    value={from ?? ""}
                    onChange={(e) => f.onChange?.([e.target.value || null, to])}
                  />
                  <span className="af-range-sep">–</span>
                  <input
                    type="date"
                    value={to ?? ""}
                    onChange={(e) => f.onChange?.([from, e.target.value || null])}
                  />
                </div>
              </div>
            );
          }

          if (f.type === "boolean") {
            return (
              <label key={f.id} className="af-field af-boolean">
                <input
                  type="checkbox"
                  checked={!!f.value}
                  onChange={(e) => f.onChange?.(e.target.checked)}
                />
                <span>{f.label}</span>
              </label>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
```

## resources/js/components/table/TableToolbar.jsx

```jsx
import React, { useEffect, useRef, useState } from "react";
import { FiSearch, FiFilter, FiSettings, FiRotateCcw, FiRefreshCw, FiDownload, FiPlus } from "react-icons/fi";
import ColumnPicker from "./ColumnPicker";

/**
 * Reusable table toolbar (non-sticky by default)
 *
 * Props:
 * - tableId: string (required)  // used for per-table persistence
 * - search: { value, onChange, placeholder }
 * - filters: [{ id, label, type: 'select'|'multiselect'|'date', value, onChange, options }]
 * - columnPicker: { columns, visibleMap, onVisibleChange }
 * - onResetWidths: () => void
 * - onRefresh: () => void
 * - onExport: () => void
 * - onAdd: () => void
 * - onToggleFilters: () => void                 // toggles the advanced FilterPanel
 * - filtersBadgeCount: number                   // shows active advanced filters count
 */
export default function TableToolbar({
  tableId,
  search = { value: "", onChange: () => {}, placeholder: "Search…" },
  filters = [],
  columnPicker,
  onResetWidths,
  onRefresh,
  onExport,
  onAdd,
  onToggleFilters,
  filtersBadgeCount = 0,
}) {
  const SEARCH_KEY = `${tableId}::search`;
  const FILT_KEY   = `${tableId}::filters`;

  // Debounced search input (300ms)
  const [localQuery, setLocalQuery] = useState(search.value || "");
  useEffect(() => setLocalQuery(search.value || ""), [search.value]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (localQuery !== search.value) search.onChange?.(localQuery);
      try { localStorage.setItem(SEARCH_KEY, localQuery); } catch {}
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuery]);

  // Persist simple filters (write-through)
  useEffect(() => {
    const pack = {};
    filters.forEach(f => { pack[f.id] = f.value; });
    try { localStorage.setItem(FILT_KEY, JSON.stringify(pack)); } catch {}
  }, [JSON.stringify(filters.map(f => ({ id: f.id, value: f.value })))]);

  // Keyboard: focus search on "/"
  const inputRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "/") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="org-toolbar" role="region" aria-label="Table toolbar">
      {/* Search */}
      <div className="org-search" role="search">
        <FiSearch className="toolbar-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          placeholder={search.placeholder || "Search…"}
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          aria-label="Search table"
        />
        {!!localQuery && (
          <button
            type="button"
            className="pill-btn ghost"
            onClick={() => setLocalQuery("")}
            title="Clear"
            aria-label="Clear search"
            style={{ height: 28, padding: "0 8px", marginLeft: 6 }}
          >
            ×
          </button>
        )}
      </div>

      {/* Basic filters (config-driven) */}
      {filters.map((f) => {
        if (f.type === "multiselect") {
          return (
            <div key={f.id} className="org-filter" title={f.label}>
              <FiFilter className="toolbar-icon" aria-hidden="true" />
              <select
                multiple
                value={Array.isArray(f.value) ? f.value : []}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map(o => o.value);
                  f.onChange?.(vals);
                }}
                aria-label={f.label}
                style={{ minWidth: 200, height: 36 }}
              >
                {f.options?.map(opt => (
                  <option key={opt.value ?? opt} value={opt.value ?? opt}>
                    {opt.label ?? opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        if (f.type === "date") {
          return (
            <div key={f.id} className="org-filter" title={f.label}>
              <FiFilter className="toolbar-icon" aria-hidden="true" />
              <input
                type="date"
                value={f.value || ""}
                onChange={(e) => f.onChange?.(e.target.value || null)}
                aria-label={f.label}
                style={{ minWidth: 180 }}
              />
            </div>
          );
        }
        // default: single select
        return (
          <div key={f.id} className="org-filter" title={f.label}>
            <FiFilter className="toolbar-icon" aria-hidden="true" />
            <select
              value={f.value ?? ""}
              onChange={(e) => f.onChange?.(e.target.value)}
              aria-label={f.label}
            >
              {(f.options || []).map(opt => (
                <option key={opt.value ?? opt} value={opt.value ?? opt}>
                  {opt.label ?? opt}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      {/* Right actions */}
      <div className="org-actions-right" role="group" aria-label="Table actions">
        {onToggleFilters && (
          <button
            className="pill-btn ghost"
            onClick={onToggleFilters}
            title="Advanced filters"
            aria-label="Advanced filters"
          >
            <FiFilter /><span className="hide-sm">Filters</span>
            {filtersBadgeCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: "#111827",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "0 6px",
                  fontSize: 12,
                  lineHeight: "18px",
                  height: 18,
                  display: "inline-flex",
                  alignItems: "center"
                }}
                aria-label={`${filtersBadgeCount} active filters`}
                title={`${filtersBadgeCount} active filters`}
              >
                {filtersBadgeCount}
              </span>
            )}
          </button>
        )}

        {onResetWidths && (
          <button className="pill-btn ghost" onClick={onResetWidths} title="Reset column widths" aria-label="Reset column widths">
            <FiRotateCcw /><span className="hide-sm">Reset</span>
          </button>
        )}

        {columnPicker && (
          <ColumnPicker
            columns={columnPicker.columns}
            visible={columnPicker.visibleMap}
            onChange={columnPicker.onVisibleChange}
            triggerRender={(open, btnRef) => (
              <button ref={btnRef} className="pill-btn ghost" onClick={open} title="Choose columns" aria-label="Choose columns">
                <FiSettings /><span className="hide-sm">Columns</span>
              </button>
            )}
            portalToBody
          />
        )}

        {onRefresh && (
          <button className="pill-btn ghost" onClick={onRefresh} title="Refresh table" aria-label="Refresh table">
            <FiRefreshCw /><span className="hide-sm">Refresh</span>
          </button>
        )}

        {onExport && (
          <button className="pill-btn ghost" onClick={onExport} title="Export CSV" aria-label="Export CSV">
            <FiDownload /><span className="hide-sm">Export</span>
          </button>
        )}

        {onAdd && (
          <button className="pill-btn primary" onClick={onAdd} title="Add new" aria-label="Add new">
            <FiPlus /><span className="hide-sm">Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
```

## resources/js/components/AppMap.jsx

```jsx
// resources/js/components/AppMap.jsx
import React from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// No default overlays here; keep AppMap minimal.

// Shared basemap definitions (mirrors MapPage.jsx)
const BASEMAPS = {
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  street:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  topographic:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};

const ATTRIBUTION =
  '&copy; <a href="https://www.esri.com/">Esri</a>, ' +
  "Earthstar Geographics, GIS User Community, " +
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors';

// Philippines extent
const PH_BOUNDS = [
  [4.6, 116.4],
  [21.1, 126.6],
];

function AppMap({
  view = "osm",
  className,
  style,
  children,
  whenCreated,
  center,
  zoom,
  minZoom = 6,
  maxZoom = 18,
  maxBounds = PH_BOUNDS,
  scrollWheelZoom = true,
  zoomControl = true,
  noWrap = true,
  tileAttribution = ATTRIBUTION,
  tileUrl, // optional override, else derived from view
}) {
  // Prefer explicit tileUrl when provided; otherwise derive from view
  const url = tileUrl || BASEMAPS[view] || BASEMAPS.osm;

  // Start with Philippines fully visible by default. If center/zoom provided, use them.
  const mapProps = center && typeof zoom !== "undefined"
    ? { center, zoom }
    : { bounds: PH_BOUNDS };

  return (
    <MapContainer
      {...mapProps}
      maxBounds={maxBounds}
      maxBoundsViscosity={1.0}
      minZoom={minZoom}
      maxZoom={maxZoom}
      zoomControl={zoomControl}
      scrollWheelZoom={scrollWheelZoom}
      whenCreated={whenCreated}
      style={{ height: "100%", width: "100%", ...(style || {}) }}
      className={className}
    >
      <TileLayer url={url} attribution={tileAttribution} noWrap={noWrap} />

      {children}
    </MapContainer>
  );
}

export default AppMap;
```

## resources/js/components/AuthModal.jsx

```jsx
// resources/js/components/AuthModal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import { api, setToken } from "../lib/api";
import {
  requestRegisterOtp, verifyRegisterOtp,
  requestForgotOtp,   verifyForgotOtp,   resetWithTicket,
  resendOtp
} from "../lib/api";
import { alertSuccess, alertError, alertInfo } from "../utils/alerts";
import { FiX } from "react-icons/fi";

export default function AuthModal({ open, onClose, mode: initialMode = "login" }) {
  const navigate = useNavigate();

  // Modes:
  // 'login' | 'register' | 'forgot' | 'verify' | 'reset'
  const [mode, setMode] = useState(initialMode);

  // Shared
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  // Register
  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");
  const [occupation, setOccupation] = useState("");
  const [occupationOther, setOccupationOther] = useState("");

  // Forgot/Verify/Reset
  const [verifyContext, setVerifyContext] = useState(null); // 'register' | 'reset'
  const [verifyEmail, setVerifyEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0); // seconds
  const [ticket, setTicket] = useState(null);

  // Derived
  const passwordsMatch = regPassword.length > 0 && regPassword === regPassword2;
  const canResend = resendIn <= 0;

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  useEffect(() => {
    if (!open) {
      setErr("");
      setLoading(false);

      // login fields
      setEmail("");
      setPassword("");
      setRemember(false);

      // register fields
      setFullName("");
      setRegEmail("");
      setRegPassword("");
      setRegPassword2("");
      setOccupation("");
      setOccupationOther("");

      // otp/reset
      setVerifyContext(null);
      setVerifyEmail("");
      setOtp("");
      setResendIn(0);
      setTicket(null);
    }
  }, [open]);

  // resend countdown
  useEffect(() => {
    if (mode !== "verify" || resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [mode, resendIn]);

  function redirectByRole(user) {
    const role = user?.role || "public";
    if (role === "superadmin") navigate("/admin-dashboard", { replace: true });
    else if (role === "org_admin") navigate("/org-dashboard", { replace: true });
    else if (role === "contributor") navigate("/contrib-dashboard", { replace: true });
    else navigate("/", { replace: true });
  }

  function extractMessage(errLike, fallback) {
    try {
      const j = JSON.parse(errLike?.message ?? "");
      if (j?.errors) {
        const first = Object.values(j.errors).flat()[0];
        return typeof first === "string" ? first : fallback;
      }
      if (j?.message) return j.message;
    } catch {}
    return fallback;
  }

  /* =========================
   * LOGIN
   * ========================= */
  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await api("/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password, remember }, // send remember to backend
      });

      if (res?.token) {
        setToken(res.token, { remember }); // store synchronously
      }

      // Confirm role from the source of truth
      const me = await api("/auth/me"); // uses the freshly stored token

      alertSuccess("Welcome back!", "Login successful.");
      redirectByRole(me);
      onClose?.();
    } catch (e2) {
      const msg = extractMessage(e2, "Invalid email or password.");
      setErr(msg);
      alertError("Login failed", msg);
    } finally {
      setPassword("");
      setLoading(false);
    }
  }

  /* =========================
   * REGISTER (→ OTP)
   * ========================= */
  async function handleRegister(e) {
    e.preventDefault();
    setErr("");

    if (!passwordsMatch) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // We start the OTP flow: do NOT create the user yet.
      const out = await requestRegisterOtp({
        name: fullName,
        email: regEmail,
        password: regPassword,
        password_confirmation: regPassword2,
        // (If you later want to collect occupation on register, extend backend to store in payload.)
      });

      setVerifyContext("register");
      setVerifyEmail(regEmail);
      setMode("verify");
      setResendIn(out?.cooldown_seconds ?? 180);
      alertInfo("Check your inbox", "We sent a 6-digit code to verify your email.");
    } catch (e2) {
      const msg = extractMessage(e2, "Registration failed. Please review your entries.");
      setErr(msg);
      alertError("Registration failed", msg);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
   * FORGOT (→ OTP)
   * ========================= */
  async function handleForgotStart(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const out = await requestForgotOtp({ email });
      setVerifyContext("reset");
      setVerifyEmail(email);
      setMode("verify");
      setResendIn(out?.cooldown_seconds ?? 180);
      alertInfo("Check your inbox", "We sent a 6-digit code to verify your email.");
    } catch (e2) {
      const msg = extractMessage(e2, "Please try again.");
      setErr(msg);
      alertError("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
   * VERIFY OTP
   * ========================= */
  async function handleVerify(e) {
    e.preventDefault();
    if (otp.length !== 6) return;
    setErr("");
    setLoading(true);
    try {
      if (verifyContext === "register") {
        const out = await verifyRegisterOtp({ email: verifyEmail, code: otp, remember });
        if (out?.token) setToken(out.token, { remember });
        const me = await api("/auth/me");
        alertSuccess("Registered & verified", "Welcome to LakeView PH!");
        redirectByRole(me);
        onClose?.();

        // clear registration fields after success
        setFullName("");
        setRegEmail("");
        setRegPassword("");
        setRegPassword2("");
        setOccupation("");
        setOccupationOther("");
      } else {
        const out = await verifyForgotOtp({ email: verifyEmail, code: otp });
        setTicket(out?.ticket || null);
        setMode("reset");
        setPassword("");
        setPassword2("");
        alertSuccess("Email verified", "Please set a new password.");
      }
    } catch (e2) {
      const msg = extractMessage(e2, "Invalid or expired code. Try again or resend.");
      setErr(msg);
      alertError("Verification failed", msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(e) {
    e.preventDefault();
    if (!canResend) return;
    setLoading(true);
    try {
      const out = await resendOtp({
        email: verifyEmail,
        purpose: verifyContext === "register" ? "register" : "reset",
      });
      setResendIn(out?.cooldown_seconds ?? 180);
      alertInfo("Code sent", "Please check your email.");
    } catch (e2) {
      const msg = extractMessage(e2, "Please wait before requesting another code.");
      setErr(msg);
      alertError("Resend blocked", msg);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
   * RESET PASSWORD (ticket)
   * ========================= */
  async function handleReset(e) {
    e.preventDefault();
    setErr("");

    if (password !== password2) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetWithTicket({
        ticket,
        password,
        password_confirmation: password2,
      });
      alertSuccess("Password updated", "You can now sign in with your new password.");
      setMode("login");
      setEmail(verifyEmail); // convenience
      setPassword("");
      setPassword2("");
    } catch (e2) {
      const msg = extractMessage(e2, "Please check your new password.");
      setErr(msg);
      alertError("Reset failed", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      header={false}
      width={600}
      ariaLabel="Authentication dialog"
      cardClassName="no-bg no-padding"
    >
      <div className="auth-box" style={{ width: 560, position: "relative" }}>
        {/* Close */}
        <button
          type="button"
          className="auth-exit-btn"
          onClick={() => onClose?.()}
          aria-label="Close authentication modal"
        >
          <FiX size={20} />
        </button>

        <div className="auth-form">
          <div className="auth-brand">
            <img src="/lakeview-logo-alt.png" alt="LakeView PH" />
            <span>LakeView PH</span>
          </div>

          {/* Headings */}
          {mode === "login" && (
            <>
              <h2>Welcome Back</h2>
              <p className="auth-subtitle">Log in to continue to LakeView PH</p>
            </>
          )}
          {mode === "register" && (
            <>
              <h2>Create a New Account</h2>
              <p className="auth-subtitle">Sign up to access LakeView PH</p>
            </>
          )}
          {mode === "forgot" && (
            <>
              <h2>Forgot Password</h2>
              <p className="auth-subtitle">Enter your email to receive a verification code</p>
            </>
          )}
          {mode === "verify" && (
            <>
              <h2>Email Verification</h2>
              <p className="auth-subtitle">We sent a 6-digit code to <strong>{verifyEmail}</strong></p>
            </>
          )}
          {mode === "reset" && (
            <>
              <h2>Set New Password</h2>
              <p className="auth-subtitle">Email: <strong>{verifyEmail}</strong></p>
            </>
          )}

          {err ? <div className="auth-error" role="alert">{err}</div> : null}

          {/* ===== LOGIN ===== */}
          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              {/* Remember me */}
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Logging in..." : "LOG IN"}
              </button>

              <div className="auth-inline">
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => { setMode("forgot"); setErr(""); setEmail(email); }}
                >
                  Forgot your password?
                </button>
                <span />
              </div>

              <p className="auth-switch">
                Don’t have an account?{" "}
                <button type="button" className="auth-link" onClick={() => setMode("register")}>
                  Sign Up
                </button>
              </p>
            </form>
          )}

          {/* ===== REGISTER (→ OTP) ===== */}
          {mode === "register" && (
            <form onSubmit={handleRegister}>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={regPassword2}
                onChange={(e) => setRegPassword2(e.target.value)}
                autoComplete="new-password"
                required
              />
              {!passwordsMatch && regPassword2.length > 0 && (
                <div className="auth-error" role="alert">Passwords do not match.</div>
              )}

              {/* Occupation (UI preserved for now; backend payload can be extended later) */}
              <label className="auth-label" htmlFor="occupation">Occupation</label>
              <select
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="auth-select"
              >
                <option value="">Select occupation</option>
                <option value="student">Student</option>
                <option value="researcher">Researcher</option>
                <option value="gov_staff">Government staff</option>
                <option value="ngo_worker">NGO worker</option>
                <option value="fisherfolk">Fisherfolk / Coop</option>
                <option value="local_resident">Local resident</option>
                <option value="faculty">Academic / Faculty</option>
                <option value="consultant">Private sector / Consultant</option>
                <option value="tourist">Tourist / Visitor</option>
                <option value="other">Other (specify)</option>
              </select>

              {occupation === "other" && (
                <input
                  type="text"
                  placeholder="Please specify your occupation"
                  value={occupationOther}
                  onChange={(e)=> setOccupationOther(e.target.value)}
                  required
                />
              )}

              <div className="auth-hint">Use at least 8 characters for a strong password.</div>

              {/* Remember me AFTER verify (applies to token created on successful OTP) */}
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me after verify</span>
              </label>

              <button type="submit" className="auth-btn" disabled={loading || !passwordsMatch}>
                {loading ? "Sending code..." : "REGISTER"}
              </button>

              <p className="auth-switch">
                Already have an account?{" "}
                <button type="button" className="auth-link" onClick={() => setMode("login")}>
                  Log In
                </button>
              </p>
            </form>
          )}

          {/* ===== FORGOT (→ OTP) ===== */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotStart}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Sending code..." : "SEND CODE"}
              </button>
              <p className="auth-switch">
                Remembered it?{" "}
                <button type="button" className="auth-link" onClick={() => setMode("login")}>
                  Back to Log In
                </button>
              </p>
            </form>
          )}

          {/* ===== VERIFY OTP ===== */}
          {mode === "verify" && (
            <form onSubmit={handleVerify}>
              <input
                className="auth-otp-input"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code"
                autoFocus
                required
              />
              <div className="auth-row">
                <button type="submit" className="auth-btn" disabled={loading || otp.length !== 6}>
                  {loading ? "Verifying..." : "VERIFY"}
                </button>
                <button
                  type="button"
                  className="auth-btn auth-btn-secondary"
                  onClick={handleResend}
                  disabled={!canResend || loading}
                >
                  {canResend
                    ? "RESEND CODE"
                    : `RESEND IN ${Math.floor(resendIn/60)}:${String(resendIn%60).padStart(2,"0")}`}
                </button>
              </div>
              <p className="auth-switch">
                Wrong email?{" "}
                <button type="button" className="auth-link" onClick={() => setMode("login")}>
                  Back to Log In
                </button>
              </p>
            </form>
          )}

          {/* ===== RESET (ticket) ===== */}
          {mode === "reset" && (
            <form onSubmit={handleReset}>
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                required
              />
              {password !== password2 && password2.length > 0 && (
                <div className="auth-error" role="alert">Passwords do not match.</div>
              )}
              <button type="submit" className="auth-btn" disabled={loading || password !== password2}>
                {loading ? "Updating..." : "UPDATE PASSWORD"}
              </button>
              <p className="auth-switch">
                Back to{" "}
                <button type="button" className="auth-link" onClick={() => setMode("login")}>
                  Log In
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
```

## resources/js/components/ConfirmDialog.jsx

```jsx
import React from "react";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} ariaLabel="Confirmation Dialog" width={520}
      footer={
        <div className="lv-modal-actions">
          <button className="pill-btn ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button className="pill-btn delete" onClick={onConfirm} disabled={loading}>
            {loading ? "Working…" : confirmText}
          </button>
        </div>
      }
    >
      <p style={{ lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}
```

## resources/js/components/ContextMenu.jsx

```jsx
import React, { useEffect, useState, useRef } from "react";
import { Marker, Tooltip } from "react-leaflet";
import { FaRuler, FaDrawPolygon, FaMapMarkerAlt, FaCopy } from "react-icons/fa";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";

// Blue pin icon
const bluePinIcon = new L.DivIcon({
  className: "custom-pin-icon",
  html: ReactDOMServer.renderToString(
    <FaMapMarkerAlt size={28} color="#1e88e5" />
  ),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -25],
});

const ContextMenu = ({ map, onMeasureDistance, onMeasureArea }) => {
  const [position, setPosition] = useState(null);
  const [latlng, setLatlng] = useState(null);
  const [pins, setPins] = useState([]);
  const menuRef = useRef();

  useEffect(() => {
    if (!map) return;

    const handleContextMenu = (e) => {
      e.originalEvent.preventDefault();
      setPosition({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });
      setLatlng(e.latlng);
    };

    const handleClose = () => setPosition(null);

    map.on("contextmenu", handleContextMenu);
    map.on("dragstart", handleClose);

    return () => {
      map.off("contextmenu", handleContextMenu);
      map.off("dragstart", handleClose);
    };
  }, [map]);

  const handleCopyCoords = () => {
    if (latlng) {
      const coords = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
      navigator.clipboard
        .writeText(coords)
        .then(() => {
          M.toast({ html: `Copied: ${coords}`, classes: "green darken-1" });
          setPosition(null);
        })
        .catch(() => {
          M.toast({ html: "Clipboard copy failed.", classes: "red darken-2" });
        });
    }
  };

  const handlePlacePin = () => {
    if (latlng) {
      setPins((prev) => [...prev, latlng]);
      setPosition(null);
    }
  };

  // Remove pin by index
  const handleRemovePin = (idx) => {
    setPins((prev) => prev.filter((_, i) => i !== idx));
    M.toast({ html: "Pin removed", classes: "red darken-2" });
  };

  return (
    <>
      {/* Context Menu */}
      {position && (
        <ul
          className="context-menu glass-panel"
          style={{ top: position.y, left: position.x, position: "absolute" }}
          ref={menuRef}
        >
          <li
            className="context-item"
            onClick={() => {
              onMeasureDistance();
              setPosition(null);
            }}
          >
            <FaRuler className="context-icon" /> Measure Distance
          </li>
          <li
            className="context-item"
            onClick={() => {
              onMeasureArea();
              setPosition(null);
            }}
          >
            <FaDrawPolygon className="context-icon" /> Measure Area
          </li>
          <li className="context-item" onClick={handlePlacePin}>
            <FaMapMarkerAlt className="context-icon" /> Place pin here
          </li>
          <li className="context-item" onClick={handleCopyCoords}>
            <FaCopy className="context-icon" /> Copy Coordinate
          </li>
        </ul>
      )}

      {/* Pins with liquid-glass tooltip */}
      {pins.map((pin, idx) => (
        <Marker
          key={idx}
          position={pin}
          icon={bluePinIcon}
          eventHandlers={{
            contextmenu: () => handleRemovePin(idx), // ✅ Right click to remove
          }}
        >
          <Tooltip
            className="glass-panel"
            direction="top"
            offset={[0, -30]}
            permanent
          >
            <FaMapMarkerAlt style={{ marginRight: 4, color: "#90caf9" }} />
            {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
};

export default ContextMenu;
```

## resources/js/components/CoordinatesScale.jsx

```jsx
import React, { useEffect, useState, useRef } from "react";
import { useMap } from "react-leaflet";
import { FaCrosshairs, FaMapMarkerAlt } from "react-icons/fa"; // two icons


const CoordinatesScale = () => {
  const map = useMap();
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  const [mode, setMode] = useState("hover");
  const [scale, setScale] = useState({ width: 100, label: "100 m" });
  const scaleRef = useRef(null);

  // --- Coordinate tracking ---
  useEffect(() => {
    if (!map) return;

    const updateCoordsHover = (e) => {
      if (mode === "hover") setCoords(e.latlng);
    };
    const updateCoordsClick = (e) => {
      if (mode === "click") setCoords(e.latlng);
    };

    map.on("mousemove", updateCoordsHover);
    map.on("click", updateCoordsClick);

    return () => {
      map.off("mousemove", updateCoordsHover);
      map.off("click", updateCoordsClick);
    };
  }, [map, mode]);

  // --- Dynamic Scale Bar ---
  useEffect(() => {
    if (!map) return;

    const updateScale = () => {
      const maxWidth = 100;
      const y = map.getSize().y / 2;
      const left = map.containerPointToLatLng([0, y]);
      const right = map.containerPointToLatLng([maxWidth, y]);

      const distance = left.distanceTo(right);
      const niceDistance = getRoundNum(distance);
      const ratio = niceDistance / distance;
      const width = Math.round(maxWidth * ratio);

      setScale({
        width,
        label:
          niceDistance >= 1000
            ? `${(niceDistance / 1000).toFixed(1)} km`
            : `${niceDistance} m`,
      });
    };

    map.on("zoom move", updateScale);
    updateScale();

    return () => {
      map.off("zoom move", updateScale);
    };
  }, [map]);

  const getRoundNum = (num) => {
    const pow10 = Math.pow(10, Math.floor(num).toString().length - 1);
    let d = num / pow10;

    if (d >= 10) d = 10;
    else if (d >= 5) d = 5;
    else if (d >= 3) d = 3;
    else if (d >= 2) d = 2;
    else d = 1;

    return pow10 * d;
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "hover" ? "click" : "hover"));
  };

  return (
  <div className="coordinates-scale glass-panel" onClick={toggleMode}>
    {/* Coordinates with Dynamic Icon */}
    <div className="coords-display">
      {mode === "hover" ? (
        <FaCrosshairs className="coords-icon" />
      ) : (
        <FaMapMarkerAlt className="coords-icon" />
      )}
      <span>
        {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
      </span>
    </div>

    {/* Scale Bar */}
    <div className="scale-bar">
      <div
        className="scale-line"
        style={{ width: `${scale.width}px` }}
        ref={scaleRef}
      />
      <div className="scale-label">{scale.label}</div>
    </div>
  </div>
);
};

export default CoordinatesScale;
```

## resources/js/components/LakeForm.jsx

```jsx
import React, { useEffect, useState } from "react";
import Modal from "./Modal";

const EMPTY = {
  id: null,
  name: "",
  alt_name: "",
  region: "",
  province: "",
  municipality: "",
  watershed_id: "",
  surface_area_km2: "",
  elevation_m: "",
  mean_depth_m: "",
};

export default function LakeForm({
  open,
  mode = "create",                // "create" | "edit"
  initialValue = EMPTY,
  watersheds = [],
  loading = false,
  onSubmit,                        // (formObject) => void
  onCancel,
}) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm({ ...EMPTY, ...initialValue });
  }, [initialValue, open]);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!form.name?.trim()) return; // minimal guard
    onSubmit?.(form);
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === "create" ? "Add Lake" : "Edit Lake"}
      ariaLabel="Lake Form"
      width={760}
      footer={
        <div className="lv-modal-actions">
          <button type="button" className="pill-btn ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="pill-btn primary" form="lv-lake-form" disabled={loading}>
            {loading ? "Saving…" : (mode === "create" ? "Create" : "Save Changes")}
          </button>
        </div>
      }
    >
      <form id="lv-lake-form" onSubmit={submit} className="lv-grid-2">
        <label className="lv-field">
          <span>Name *</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Alt Name</span>
          <input
            value={form.alt_name}
            onChange={(e) => setForm({ ...form, alt_name: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Region</span>
          <input
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Province</span>
          <input
            value={form.province}
            onChange={(e) => setForm({ ...form, province: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Municipality/City</span>
          <input
            value={form.municipality}
            onChange={(e) => setForm({ ...form, municipality: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Watershed</span>
          <select
            value={form.watershed_id ?? ""}
            onChange={(e) => setForm({ ...form, watershed_id: e.target.value })}
          >
            <option value="">— None —</option>
            {watersheds.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </label>

        <label className="lv-field">
          <span>Surface Area (km²)</span>
          <input
            type="number"
            step="0.001"
            value={form.surface_area_km2}
            onChange={(e) => setForm({ ...form, surface_area_km2: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Elevation (m)</span>
          <input
            type="number"
            step="0.001"
            value={form.elevation_m}
            onChange={(e) => setForm({ ...form, elevation_m: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Mean Depth (m)</span>
          <input
            type="number"
            step="0.001"
            value={form.mean_depth_m}
            onChange={(e) => setForm({ ...form, mean_depth_m: e.target.value })}
          />
        </label>

        
      </form>
    </Modal>
  );
}
```

## resources/js/components/LakeInfoPanel.jsx

```jsx
// src/components/LakeInfoPanel.jsx
import React, { useState, useEffect, useMemo } from "react";
import { FiX } from "react-icons/fi";

function LakeInfoPanel({ isOpen, onClose, lake, onToggleHeatmap }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [distance, setDistance] = useState(2); // km filter
  const [estimatedPop, setEstimatedPop] = useState(0);
  const [closing, setClosing] = useState(false);

  // Reset closing when panel re-opens
  useEffect(() => {
    if (isOpen) setClosing(false);
  }, [isOpen]);

  // Whenever a new lake is selected, return to Overview tab
  useEffect(() => {
    if (lake) setActiveTab("overview");
  }, [lake?.id]);

  // Mock population estimate (placeholder)
  useEffect(() => {
    if (activeTab === "population") {
      const fakeEstimate = Math.round(15000 + distance * 20000);
      setEstimatedPop(fakeEstimate);
    }
  }, [distance, activeTab]);

  // ---------- Formatting helpers ----------
  const fmtNum = (v, suffix = "", digits = 2) => {
    if (v === null || v === undefined || v === "") return "–";
    const n = Number(v);
    if (!Number.isFinite(n)) return "–";
    return `${n.toFixed(digits)}${suffix}`;
  };
  const fmtDate = (v) => (v ? new Date(v).toLocaleString() : "–");

  // ---------- Derived display strings ----------
  const watershedName = useMemo(() => {
    if (!lake) return "–";
    // support either nested relation or flattened property
    return lake?.watershed?.name || lake?.watershed_name || "–";
  }, [lake]);

  const locationStr = useMemo(() => {
    if (!lake) return "–";
    const parts = [lake.municipality, lake.province, lake.region].filter(Boolean);
    return parts.length ? parts.join(", ") : "–";
  }, [lake]);

  const areaStr       = useMemo(() => fmtNum(lake?.surface_area_km2, " km²", 2), [lake]);
  const elevationStr  = useMemo(() => fmtNum(lake?.elevation_m, " m", 1), [lake]);
  const meanDepthStr  = useMemo(() => fmtNum(lake?.mean_depth_m, " m", 1), [lake]);
  const createdAtStr  = useMemo(() => fmtDate(lake?.created_at), [lake]);
  const updatedAtStr  = useMemo(() => fmtDate(lake?.updated_at), [lake]);

  // Prevent render if nothing to show
  if (!lake && !isOpen) return null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "population") onToggleHeatmap?.(true, distance);
    else onToggleHeatmap?.(false);
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { onClose?.(); }, 350); // match CSS transition
  };

  return (
    <div className={`lake-info-panel ${isOpen && !closing ? "open" : "closing"}`}>
      {/* Header */}
      <div className="lake-info-header">
        <div>
          <h2 className="lake-info-title" style={{ marginBottom: 2 }}>
            {lake?.name || "Lake"}
          </h2>
          {lake?.alt_name ? (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              Also known as <em>{lake.alt_name}</em>
            </div>
          ) : null}
        </div>
        <button className="close-btn" onClick={handleClose} aria-label="Close lake panel">
          <FiX size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="lake-info-tabs">
        <button
          className={`lake-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => handleTabChange("overview")}
        >
          Overview
        </button>
        <button
          className={`lake-tab ${activeTab === "water" ? "active" : ""}`}
          onClick={() => handleTabChange("water")}
        >
          Water Quality
        </button>
        <button
          className={`lake-tab ${activeTab === "population" ? "active" : ""}`}
          onClick={() => handleTabChange("population")}
        >
          Population Density
        </button>
      </div>

      {/* Image (only on overview tab, only if provided) */}
      {activeTab === "overview" && lake?.image && (
        <div className="lake-info-image">
          <img src={lake.image} alt={lake.name} />
        </div>
      )}

      {/* Content */}
      <div className="lake-info-content">
        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
              <div><strong>Watershed:</strong></div>
              <div>{watershedName}</div>

              <div><strong>Region:</strong></div>
              <div>{lake?.region || "–"}</div>

              <div><strong>Province:</strong></div>
              <div>{lake?.province || "–"}</div>

              <div><strong>Municipality/City:</strong></div>
              <div>{lake?.municipality || "–"}</div>

              <div><strong>Surface Area:</strong></div>
              <div>{areaStr}</div>

              <div><strong>Elevation:</strong></div>
              <div>{elevationStr}</div>

              <div><strong>Mean Depth:</strong></div>
              <div>{meanDepthStr}</div>

              <div><strong>Location (full):</strong></div>
              <div>{locationStr}</div>
            </div>
          </>
        )}

        {activeTab === "water" && (
          <p><em>Water quality reports will appear here.</em></p>
        )}

        {activeTab === "population" && (
          <>
            <h3>Population Density Heatmap</h3>
            <p>
              Heatmap of population living around <strong>{lake?.name}</strong>.
            </p>

            {/* Distance filter slider */}
            <div
              className="slider-container"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.stopPropagation()}
            >
              <label htmlFor="distanceRange">
                Distance from shoreline: {distance} km
              </label>
              <input
                id="distanceRange"
                type="range"
                min="1"
                max="10"
                step="1"
                value={distance}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setDistance(val);
                  onToggleHeatmap?.(true, val);
                }}
              />
            </div>

            {/* Estimated population insight */}
            <div className="insight-card">
              <h4>Estimated Population</h4>
              <p>
                ~ <strong>{estimatedPop.toLocaleString()}</strong> people
                within {distance} km of the shoreline
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LakeInfoPanel;
```

## resources/js/components/LayerControl.jsx

```jsx
// src/components/LayerControl.jsx
import React, { useState } from "react";
import { FiLayers } from "react-icons/fi";

function LayerControl({ selectedView, setSelectedView }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="layer-control">
      {/* Floating Button */}
      <button
        className="btn-floating"
        onClick={() => setOpen(!open)}
      >
        <FiLayers className="icon-layer" />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="layer-panel">
          <h6 className="layer-title">Toggle Map Views</h6>
          <label>
            <input
              type="radio"
              name="map-view"
              value="satellite"
              checked={selectedView === "satellite"}
              onChange={() => setSelectedView("satellite")}
            />
            <span>Satellite View</span>
          </label>
          <label>
            <input
              type="radio"
              name="map-view"
              value="topographic"
              checked={selectedView === "topographic"}
              onChange={() => setSelectedView("topographic")}
            />
            <span>Topographic View</span>
          </label>
          <label>
            <input
              type="radio"
              name="map-view"
              value="street"
              checked={selectedView === "street"}
              onChange={() => setSelectedView("street")}
            />
            <span>Street View</span>
          </label>
          <label>
            <input
              type="radio"
              name="map-view"
              value="osm"
              checked={selectedView === "osm"}
              onChange={() => setSelectedView("osm")}
            />
            <span>OpenStreetMap</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default LayerControl;
```

## resources/js/components/MapControls.jsx

```jsx
// src/components/MapControls.jsx
import React, { useState } from "react";
import { useMap, Marker, Tooltip } from "react-leaflet"; // use Tooltip instead of Popup
import { FiBarChart2, FiCrosshair, FiPlus, FiMinus } from "react-icons/fi";
import { FaLocationDot } from "react-icons/fa6"; // filled location dot
import L from "leaflet";
import ReactDOMServer from "react-dom/server";


// Filled location icon
const locationIcon = new L.DivIcon({
  className: "custom-location-icon",
  html: ReactDOMServer.renderToString(
    <FaLocationDot size={30} color="#e53935" /> // Bright red for visibility
  ),
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});

function MapControls({ defaultCenter = [12.8797, 121.7740], defaultZoom = 6, defaultBounds = null }) {
  const map = useMap();
  const [geolocated, setGeolocated] = useState(false);
  const [position, setPosition] = useState(null);

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();

  const handleGeolocation = () => {
    if (!geolocated) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const userPos = [latitude, longitude];
            setPosition(userPos);
            map.setView(userPos, 14);
            setGeolocated(true);
          },
          () => alert("Unable to fetch your location.")
        );
      }
    } else {
      // Reset to default view
      if (defaultBounds) map.fitBounds(defaultBounds);
      else map.setView(defaultCenter, defaultZoom);
      setPosition(null);
      setGeolocated(false);
    }
  };

  return (
    <>
      {/* Floating Controls */}
      <div className="map-controls">
        <button className="btn-floating">
          <FiBarChart2 className="icon-layer" />
        </button>
        <button className="btn-floating" onClick={handleGeolocation}>
          <FiCrosshair className="icon-layer" />
        </button>
        <button className="btn-floating" onClick={handleZoomIn}>
          <FiPlus className="icon-layer" />
        </button>
        <button className="btn-floating" onClick={handleZoomOut}>
          <FiMinus className="icon-layer" />
        </button>
      </div>

      {/* Location Marker with liquid-glass tooltip */}
      {position && (
        <Marker position={position} icon={locationIcon}>
          <Tooltip
            className="glass-panel"
            direction="top"
            offset={[0, -35]}
            permanent
          >
            <FaLocationDot
              className="popup-icon"
              style={{ marginRight: 4, color: "#e53935" }}
            />
            <span>You are here</span>
          </Tooltip>
        </Marker>
      )}
    </>
  );
}

export default MapControls;
```

## resources/js/components/MeasureTool.jsx

```jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Polyline, Polygon, Marker, Pane, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-geometryutil";
import * as turf from "@turf/turf";

export default function MeasureTool({ active, mode = "distance", onFinish }) {
  const map = useMap();

  const [points, setPoints] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const [unitSystem, setUnitSystem] = useState("metric");
  const [paused, setPaused] = useState(false);
  const [closed, setClosed] = useState(false);

  const initialCursorRef = useRef("");

  useEffect(() => {
    if (!active) {
      setPoints([]);
      setMousePos(null);
      setPaused(false);
      setClosed(false);
    } else {
      setPoints([]);
      setMousePos(null);
      setPaused(false);
      setClosed(false);
    }
  }, [active, mode]);

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();

    if (active && initialCursorRef.current === "") {
      initialCursorRef.current = container.style.cursor || "";
    }

    if (active && !paused) {
      container.style.cursor = "crosshair";
    } else {
      container.style.cursor = initialCursorRef.current || "";
    }

    return () => {
      container.style.cursor = initialCursorRef.current || "";
    };
  }, [map, active, paused]);

  const formatDistance = (meters) => {
    if (unitSystem === "metric") {
      return meters >= 1000
        ? `${(meters / 1000).toFixed(2)} km`
        : `${meters.toFixed(1)} m`;
    } else {
      const feet = meters * 3.28084;
      return feet >= 5280
        ? `${(feet / 5280).toFixed(2)} mi`
        : `${feet.toFixed(1)} ft`;
    }
  };

  const formatArea = (m2) => {
    if (unitSystem === "metric") {
      return m2 >= 1_000_000
        ? `${(m2 / 1_000_000).toFixed(3)} km²`
        : `${m2.toFixed(1)} m²`;
    } else {
      const ft2 = m2 * 10.7639;
      const acres = ft2 / 43560;
      const mi2 = m2 / 2_589_988.110336;
      if (mi2 >= 0.1) return `${mi2.toFixed(3)} mi²`;
      if (acres >= 0.1) return `${acres.toFixed(2)} acres`;
      return `${ft2.toFixed(1)} ft²`;
    }
  };

  const totalDistance = useMemo(() => {
    if (points.length < 2) return 0;
    return points.reduce((sum, p, i) => {
      if (i === 0) return 0;
      return sum + p.distanceTo(points[i - 1]);
    }, 0);
  }, [points]);

  const polygonAreaM2 = useMemo(() => {
    if (mode !== "area" || points.length < 3) return 0;
    const coords = points.map((p) => [p.lng, p.lat]);
    coords.push(coords[0]);
    try {
      const polygon = turf.polygon([coords]);
      return turf.area(polygon);
    } catch {
      return 0;
    }
  }, [mode, points]);

  const centroid = useMemo(() => {
    if (points.length === 0) return null;
    try {
      return L.polygon(points).getBounds().getCenter();
    } catch {
      return points[points.length - 1];
    }
  }, [points]);

  useEffect(() => {
    if (!map || !active) return;

    const handleClick = (e) => {
      if (paused) return;
      if (mode === "area" && points.length >= 3) {
        const first = points[0];
        const clickPt = map.latLngToLayerPoint(e.latlng);
        const firstPt = map.latLngToLayerPoint(first);
        if (clickPt.distanceTo(firstPt) <= 10) {
          setClosed(true);
          setPaused(true);
          setMousePos(null);
          return;
        }
      }
      setPoints((prev) => [...prev, e.latlng]);
    };

    const handleMouseMove = (e) => {
      if (!paused) setMousePos(e.latlng);
    };

    map.on("click", handleClick);
    map.on("mousemove", handleMouseMove);

    const keyHandler = (e) => {
      const k = e.key?.toLowerCase?.();
      if (k === "escape") {
        e.preventDefault();
        e.stopPropagation();
        if (!paused) {
          setPaused(true);
          setMousePos(null);
        } else {
          setPoints([]);
          setMousePos(null);
          setClosed(false);
          onFinish?.();
        }
      } else if (k === "u") {
        setUnitSystem((u) => (u === "metric" ? "imperial" : "metric"));
      }
    };
    window.addEventListener("keydown", keyHandler, true);

    return () => {
      map.off("click", handleClick);
      map.off("mousemove", handleMouseMove);
      window.removeEventListener("keydown", keyHandler, true);
    };
  }, [map, active, mode, paused, points]);

  if (!active && points.length === 0) return null;

  let renderPoints = points;
  if (!paused && mousePos && points.length > 0) {
    if (mode === "distance") renderPoints = [...points, mousePos];
    else if (mode === "area" && !closed) renderPoints = [...points, mousePos];
  }

  const makeGlassIcon = (text) =>
    L.divIcon({
      className: "measure-label glass-panel",
      html: `<div>${text}</div>`,
      iconSize: "auto",
    });

  const vertexIcon = new L.DivIcon({
    className: "",
    html: `<div style="
      width:12px;height:12px;
      background:#1976d2;
      border:2px solid #fff;
      border-radius:50%;
      box-shadow:0 0 6px 3px rgba(25,118,210,0.6);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  return (
    <>
      {mode === "distance" && renderPoints.length > 1 && (
        <Polyline positions={renderPoints} pathOptions={{ color: "#1976d2", weight: 3 }} />
      )}
      {mode === "area" && renderPoints.length > 2 && (
        <Polygon positions={renderPoints} pathOptions={{ color: "#1976d2", weight: 2, fillOpacity: 0.15 }} />
      )}

      {points.map((p, i) => (
        <Marker
          key={i}
          position={p}
          icon={vertexIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const newLatLng = e.target.getLatLng();
              setPoints((prev) => {
                const updated = [...prev];
                updated[i] = newLatLng;
                return updated;
              });
            },
            contextmenu: () => {
              setPoints((prev) => prev.filter((_, idx) => idx !== i));
            },
          }}
        >
          <Tooltip direction="top" opacity={1} className="glass-panel">
            Drag to move • Right-click to delete
          </Tooltip>
        </Marker>
      ))}

      {mode === "distance" && points.length > 1 && (
        <Pane name="measure-labels" style={{ zIndex: 1000 }}>
          <Marker
            position={points[points.length - 1]}
            icon={makeGlassIcon(`Total: ${formatDistance(totalDistance)}`)}
            interactive={false}
          />
        </Pane>
      )}

      {mode === "area" && points.length > 2 && centroid && (
        <Pane name="measure-labels" style={{ zIndex: 1000 }}>
          <Marker
            position={centroid}
            icon={makeGlassIcon(`Area: ${formatArea(polygonAreaM2)}`)}
            interactive={false}
          />
        </Pane>
      )}
    </>
  );
}
```

## resources/js/components/Modal.jsx

```jsx
import React from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 720,
  ariaLabel = "Dialog",
  header = true,
  cardClassName = "",
  bodyClassName = "",
  style = {},
}) {
  if (!open) return null;

  return createPortal(
    <div className="lv-modal-overlay" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className={`lv-modal-card ${cardClassName}`} style={{ width, maxWidth: "95vw", ...style }}>
        {header && (
          <div className="lv-modal-header">
            <h3 className="lv-modal-title">{title}</h3>
            <button className="lv-icon-btn" onClick={onClose} aria-label="Close dialog">
              <FiX />
            </button>
          </div>
        )}

        <div className={`lv-modal-body ${bodyClassName}`}>{children}</div>

        {footer && <div className="lv-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
```

## resources/js/components/OrganizationForm.jsx

```jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { alertError } from '../utils/alerts';

export default function OrganizationForm({ isOpen, onClose, onSaved, initialData = null, api }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    domain: '',
    contact_email: '',
    phone: '',
    address: '',
    active: true,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        domain: initialData.domain || '',
        contact_email: initialData.contact_email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        active: typeof initialData.active !== 'undefined' ? !!initialData.active : true,
      });
    } else {
      setForm({
        name: '',
        domain: '',
        contact_email: '',
        phone: '',
        address: '',
        active: true,
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (initialData && initialData.id) {
        const res = await api.put(`/admin/tenants/${initialData.id}`, form);
        onSaved(res.data);
      } else {
        const res = await api.post('/admin/tenants', form);
        onSaved(res.data);
      }
    } catch (err) {
      if (err.response && err.response.status === 422 && err.response.data.errors) {
        setErrors(err.response.data.errors);
      } else {
        alertError(err);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Organization' : 'Add Organization'}>
      <form onSubmit={handleSubmit} className="card" style={{ padding: 18 }}>
        <div className="input-field">
          <input name="name" value={form.name} onChange={onChange} required />
          <label className={form.name ? 'active' : ''}>Name</label>
          {errors.name && <span className="helper-text red-text">{errors.name[0]}</span>}
        </div>

        <div className="input-field">
          <input name="domain" value={form.domain} onChange={onChange} />
          <label className={form.domain ? 'active' : ''}>Domain (optional)</label>
          {errors.domain && <span className="helper-text red-text">{errors.domain[0]}</span>}
        </div>

        <div className="input-field">
          <input name="contact_email" value={form.contact_email} onChange={onChange} />
          <label className={form.contact_email ? 'active' : ''}>Contact Email</label>
          {errors.contact_email && <span className="helper-text red-text">{errors.contact_email[0]}</span>}
        </div>

        <div className="input-field">
          <input name="phone" value={form.phone} onChange={onChange} />
          <label className={form.phone ? 'active' : ''}>Phone</label>
          {errors.phone && <span className="helper-text red-text">{errors.phone[0]}</span>}
        </div>

        <div className="input-field">
          <textarea name="address" className="materialize-textarea" value={form.address} onChange={onChange} />
          <label className={form.address ? 'active' : ''}>Address</label>
          {errors.address && <span className="helper-text red-text">{errors.address[0]}</span>}
        </div>

        <div className="switch" style={{ marginBottom: 12 }}>
          <label>
            Inactive
            <input type="checkbox" name="active" checked={form.active} onChange={onChange} />
            <span className="lever"></span>
            Active
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn-flat" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" className="btn waves-effect waves-light" disabled={loading}>
            {loading ? (initialData ? 'Saving...' : 'Creating...') : (initialData ? 'Save' : 'Create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

## resources/js/components/RequireRole.jsx

```jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function RequireRole({ allowed = [], children }) {
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const me = await api('/auth/me');
        setOk(allowed.includes(me.role));
      } catch {
        setOk(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) return null; // or spinner
  if (!ok) { nav('/login'); return null; }
  return children;
}
```

## resources/js/components/Screenshotbutton.jsx

```jsx
// src/components/ScreenshotButton.jsx
import React from "react";
import { FiCamera } from "react-icons/fi";
import domtoimage from "dom-to-image";

function ScreenshotButton() {
  const handleScreenshot = () => {
    const mapContainer = document.querySelector(".leaflet-container");

    // Select overlays to hide
    const overlays = document.querySelectorAll(
      ".search-bar, .coordinates-scale, .layer-control, .map-controls, .screenshot-btn, .leaflet-control-container"
    );
    overlays.forEach((el) => (el.style.display = "none"));

    domtoimage.toBlob(mapContainer).then((blob) => {
      // Download image
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "map-screenshot.png";
      link.click();

      // Restore overlays
      overlays.forEach((el) => (el.style.display = ""));
    });
  };

  return (
    <div className="screenshot-btn">
      <button className="btn-floating" onClick={handleScreenshot}>
        <FiCamera className="icon-layer" />
      </button>
    </div>
  );
}

export default ScreenshotButton;
```

## resources/js/components/SearchBar.jsx

```jsx
// src/components/SearchBar.jsx
import React from "react";
import { FiMenu, FiSearch, FiFilter } from "react-icons/fi";

function SearchBar({ onMenuClick }) {
  return (
    <div className="search-bar">
      {/* ✅ Hamburger opens sidebar */}
      <button className="btn-floating" onClick={onMenuClick}>
        <FiMenu size={18} />
      </button>

      <input type="text" placeholder="Search LakeView" />

      <button className="btn-floating">
        <FiSearch size={18} />
      </button>

      <button className="btn-floating">
        <FiFilter size={18} />
      </button>
    </div>
  );
}

export default SearchBar;
```

## resources/js/components/Sidebar.jsx

```jsx
// resources/js/components/Sidebar.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  FiX,
  FiInfo,
  FiBookOpen,
  FiSend,
  FiGithub,
  FiDatabase,
  FiSettings,
  FiLogIn,
  FiLogOut,
  FiUser,
  FiMapPin,
} from "react-icons/fi";
import { MapContainer, TileLayer, Rectangle, useMap } from "react-leaflet";
import { Link, useNavigate } from "react-router-dom";
import { api, clearToken, getToken } from "../lib/api";
import "leaflet/dist/leaflet.css";
import { confirm, alertSuccess } from "../utils/alerts";

// ─────────────────────────────────────────────────────────────────────────────
// MiniMap that stays centered and updates live
function MiniMap({ parentMap }) {
  const [bounds, setBounds] = useState(parentMap.getBounds());
  const [center, setCenter] = useState(parentMap.getCenter());
  const [zoom, setZoom] = useState(parentMap.getZoom());
  const minimapRef = useRef();

  useEffect(() => {
    function update() {
      setBounds(parentMap.getBounds());
      setCenter(parentMap.getCenter());
      setZoom(parentMap.getZoom());

      const mini = minimapRef.current;
      if (mini) {
        mini.setView(parentMap.getCenter(), Math.max(parentMap.getZoom() - 3, 1));
      }
    }
    parentMap.on("move", update);
    parentMap.on("zoom", update);

    return () => {
      parentMap.off("move", update);
      parentMap.off("zoom", update);
    };
  }, [parentMap]);

  return (
    <MapContainer
      center={center}
      zoom={Math.max(zoom - 3, 1)}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      attributionControl={false}
      style={{ height: "250px", width: "100%" }}
      ref={minimapRef}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Rectangle bounds={bounds} pathOptions={{ color: "red", weight: 1 }} />
    </MapContainer>
  );
}

function MiniMapWrapper() {
  const map = useMap();
  return <MiniMap parentMap={map} />;
}

// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({ isOpen, onClose, pinned, setPinned, onOpenAuth }) {
  const [me, setMe] = useState(null); // { id, name, role }
  const navigate = useNavigate();

  // Centralized fetch for /auth/me
  const fetchMe = async () => {
    try {
      const u = await api("/auth/me");
      setMe(u && u.id ? u : null);
    } catch {
      setMe(null);
    }
  };

  useEffect(() => {
    const fetchMe = async () => {
      try { setMe(await api("/auth/me")); } catch { setMe(null); }
    };
    if (getToken()) fetchMe(); // gate initial fetch

    const onAuthChange = () => (getToken() ? fetchMe() : setMe(null));
    const onFocus = () => (getToken() ? fetchMe() : setMe(null));

    window.addEventListener("lv-auth-change", onAuthChange);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("lv-auth-change", onAuthChange);
      window.removeEventListener("focus", onFocus);
    };
  }, []);


  const isLoggedIn = !!me?.id;
  const isPublic = isLoggedIn && (me.role === "public" || !me.role);

  return (
    <div className={`sidebar ${isOpen ? "open" : ""} ${pinned ? "pinned" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/lakeview-logo-alt.png" alt="LakeView PH Logo" />
          <h2 className="sidebar-title">LakeView PH</h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Pin */}
          <button
            className={`sidebar-icon-btn ${pinned ? "active" : ""}`}
            onClick={() => setPinned(!pinned)}
            title={pinned ? "Unpin Sidebar" : "Pin Sidebar"}
          >
            <FiMapPin size={18} />
          </button>

          {/* Close (hidden if pinned) */}
          {!pinned && (
            <button
              className="sidebar-icon-btn"
              onClick={onClose}
              title="Close Sidebar"
            >
              <FiX size={20} />
            </button>
          )}
        </div>
      </div>

      {/* MiniMap */}
      <div className="sidebar-minimap">
        <MiniMapWrapper />
      </div>

      {/* Menu Links */}
      <ul className="sidebar-menu">
        

        <li>
          <Link className="sidebar-row" to="/about" onClick={!pinned ? onClose : undefined}>
            <FiInfo className="sidebar-icon" />
            <span>About LakeView PH</span>
          </Link>
        </li>
        <li>
          <Link className="sidebar-row" to="/manual" onClick={!pinned ? onClose : undefined}>
            <FiBookOpen className="sidebar-icon" />
            <span>How to use LakeView?</span>
          </Link>
        </li>
        <li>
          <Link className="sidebar-row" to="/feedback" onClick={!pinned ? onClose : undefined}>
            <FiSend className="sidebar-icon" />
            <span>Submit Feedback</span>
          </Link>
        </li>
        <li>
          <a
            className="sidebar-row"
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={!pinned ? onClose : undefined}
          >
            <FiGithub className="sidebar-icon" />
            <span>GitHub Page</span>
          </a>
        </li>
        <li>
          <Link className="sidebar-row" to="/data" onClick={!pinned ? onClose : undefined}>
            <FiDatabase className="sidebar-icon" />
            <span>About the Data</span>
          </Link>
        </li>
      </ul>

      {/* Bottom Menu */}
      <ul className="sidebar-bottom">
        <li>
          <Link className="sidebar-row" to="/settings" onClick={!pinned ? onClose : undefined}>
            <FiSettings className="sidebar-icon" />
            <span>Settings</span>
          </Link>
        </li>

        {isLoggedIn ? (
          <>
            {/* (Optional) Keep a compact user row near Sign out */}
            <li aria-label="Logged-in user" title={me?.name || ""}>
              <div className="sidebar-row" style={{ cursor: "default" }}>
                <FiUser className="sidebar-icon" />
                <span>{me?.name}</span>
              </div>
            </li>

            <li>
              <button
                className="sidebar-row"
                onClick={async () => {
                  const ok = await confirm(
                    "Sign out?",
                    "You will be logged out of LakeView PH.",
                    "Yes, sign out"
                  );
                  if (!ok) return;

                  try {
                    await api("/auth/logout", { method: "POST" });
                  } catch {}
                  clearToken(); // dispatches lv-auth-change if you patched api.js
                  setMe(null);
                  if (!pinned) onClose?.();

                  await alertSuccess("Signed out", "You have been signed out successfully.");
                  navigate("/");
                }}
              >
                <FiLogOut className="sidebar-icon" />
                <span>Sign out</span>
              </button>
            </li>
          </>
        ) : (
          <li>
            {onOpenAuth ? (
              <button
                className="sidebar-row"
                onClick={() => {
                  onOpenAuth("login");
                  if (!pinned) onClose?.();
                }}
              >
                <FiLogIn className="sidebar-icon" />
                <span>Log in</span>
              </button>
            ) : (
              <Link className="sidebar-row" to="/login" onClick={!pinned ? onClose : undefined}>
                <FiLogIn className="sidebar-icon" />
                <span>Log in</span>
              </Link>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

export default Sidebar;
```

## resources/js/components/Wizard.jsx

```jsx
// resources/js/components/Wizard.jsx
import React, { useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

/**
 * Wizard
 * - Reusable stepper for multi-step flows.
 *
 * Props:
 * - steps: Array<{
 *     key: string;
 *     title: string;
 *     render: (ctx: {data, setData, stepIndex}) => React.ReactNode;
 *     canNext?: (data) => boolean;     // optional gate before going next
 *   }>
 * - initialData?: any                 // shared cross-step state
 * - initialStep?: number              // default 0
 * - onFinish?: (data) => void         // called on final "Finish"
 * - labels?: { back?, next?, finish? }
 *
 * Usage:
 * <Wizard steps={[...]} onFinish={(data)=>{}} />
 */
export default function Wizard({
  steps,
  initialData = {},
  initialStep = 0,
  onFinish,
  labels = { back: "Back", next: "Next", finish: "Finish" },
}) {
  const [stepIndex, setStepIndex] = useState(initialStep);
  const [data, setData] = useState(initialData);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const current = useMemo(() => steps[stepIndex] || null, [steps, stepIndex]);
  const canGoNext = useMemo(() => {
    if (!current) return false;
    if (typeof current.canNext === "function") return !!current.canNext(data);
    return true; // default: allow
  }, [current, data]);

  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (!canGoNext) return;
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  };
  const finish = () => {
    if (!canGoNext) return;
    onFinish?.(data);
  };

  return (
    <div>
      {/* Step indicator */}
      <div className="dashboard-card" style={{ marginBottom: 12 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <span>Wizard</span>
          </div>
        </div>
        <div className="wizard-steps">
          {steps.map((s, idx) => {
            const state = idx === stepIndex ? "active" : idx < stepIndex ? "done" : "";
            return (
              <div key={s.key} className={`wizard-step ${state}`}>
                <span className="step-index">{idx + 1}</span>
                <span className="step-label">{s.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      {current && current.render({ data, setData, stepIndex })}

      {/* Nav */}
      <div className="wizard-nav">
        <button className="pill-btn" disabled={isFirst} onClick={goPrev}>
          <FiChevronLeft /> <span className="hide-sm">{labels.back}</span>
        </button>
        <div style={{ flex: 1 }} />
        {!isLast ? (
          <button className="pill-btn primary" disabled={!canGoNext} onClick={goNext}>
            <span className="hide-sm">{labels.next}</span> <FiChevronRight />
          </button>
        ) : (
          <button className="pill-btn primary" disabled={!canGoNext} onClick={finish}>
            {labels.finish}
          </button>
        )}
      </div>
    </div>
  );
}
```

## resources/js/layouts/DashboardLayout.jsx

```jsx
// resources/js/layouts/DashboardLayout.jsx
import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FiMap,
  FiLogOut,
  FiUser,
  FiChevronsLeft,
  FiChevronsRight,
} from "react-icons/fi";
import { api, clearToken, getToken } from "../lib/api";
import { confirm, alertSuccess } from "../utils/alerts"; // ⬅️ SweetAlert2 helpers

export default function DashboardLayout({ links, user, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!getToken()) return; // gate
        const u = await api("/auth/me");
        if (mounted) setMe(u);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  // Find active link
  const activeLink = links.find(
    (l) => location.pathname === l.path || (l.exact && location.pathname === l.path)
  );

  // 🔔 SweetAlert2-powered signout
  async function handleSignOut() {
    const ok = await confirm(
      "Sign out?",
      "You will be logged out of LakeView PH.",
      "Yes, sign out"
    );
    if (!ok) return;

    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore API errors; we still clear local state
    }

    clearToken();

    // Show success toast BEFORE navigation so it’s visible
    await alertSuccess("Signed out", "You have been signed out successfully.");

    navigate("/");
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${collapsed ? "collapsed" : ""}`}>
        <div>
          {/* Logo Row */}
          <div className="dashboard-logo">
            <img src="/lakeview-logo-alt.png" alt="LakeView PH Logo" />
            <span className="dashboard-logo-text">LakeView PH</span>
          </div>

          {/* Navigation */}
          <ul className="dashboard-nav-links" role="navigation" aria-label="Dashboard">
            {links.map((link, i) => (
              <li key={i}>
                <NavLink to={link.path} end={link.exact || false} title={link.label}>
                  {link.icon}
                  <span className="link-text">{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* User Section */}
        <div className="dashboard-user-section">
          <div className="dashboard-user-info" title={me?.name || ""}>
            <FiUser size={18} />
            {me?.name ? <span className="user-name">{me.name}</span> : null}
          </div>
          <div
            className="dashboard-signout"
            role="button"
            tabIndex={0}
            onClick={handleSignOut}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleSignOut()}
          >
            <FiLogOut size={18} /> <span className="signout-text">Sign out</span>
          </div>
        </div>

        {/* Drawer toggle (stick to right side, vertically centered) */}
        <button
          className="sidebar-toggle drawer"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <FiChevronsRight size={18} /> : <FiChevronsLeft size={18} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {activeLink && (
          <div className="dashboard-page-header">
            <div className="page-header-icon">{activeLink.icon}</div>
            <h1 className="page-header-title">{activeLink.label}</h1>
            <div className="page-header-actions">
              <NavLink to="/" className="btn-icon" title="View Public Map">
                <FiMap size={18} />
              </NavLink>
            </div>
          </div>
        )}
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}
```

## resources/js/layouts/TableLayout.jsx

```jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * TableLayout: resizable columns, icon-only actions, pagination
 *
 * Props:
 * - tableId: string (localStorage key for widths)
 * - columns: [{ id, header, accessor?, render?, width?, className? }]
 * - data: array
 * - pageSize: number
 * - actions: [{ label, title, icon, onClick(row), type? }] // type can be 'edit' | 'delete'
 * - resetSignal: number  // increment to reset widths
 */
export default function TableLayout({
  tableId = "lv-table",
  columns = [],
  data = [],
  pageSize = 10,
  actions = [],
  resetSignal = 0,
}) {
  // Normalize columns with ids
  const normalizedCols = useMemo(() => {
    return columns.map((c, i) => ({ id: c.id || c.accessor || `col_${i}`, ...c }));
  }, [columns]);

  // Persist column widths
  const WID_KEY = `${tableId}::widths`;
  const [widths, setWidths] = useState(() => {
    try {
      const raw = localStorage.getItem(WID_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const init = {};
    normalizedCols.forEach((c) => { if (c.width) init[c.id] = c.width; });
    return init;
  });
  useEffect(() => {
    try { localStorage.setItem(WID_KEY, JSON.stringify(widths)); } catch {}
  }, [widths]);
  useEffect(() => { setWidths({}); }, [resetSignal]);

  // Resize handlers
  const startResize = (colId, e) => {
    e.preventDefault(); e.stopPropagation();
    const th = e.target.closest("th");
    const startX = e.clientX;
    const startWidth = parseInt(getComputedStyle(th).width, 10);
    const min = 96;
    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      const nw = Math.max(min, startWidth + delta);
      setWidths((w) => ({ ...w, [colId]: nw }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const getCellContent = (row, col) => {
    if (col.render) return col.render(row._raw ?? row, row);
    if (col.accessor) return row[col.accessor];
    return "";
  };

  return (
    <div className="lv-table-wrap">
      <div className="lv-table-scroller">
        <table className="lv-table">
          <thead>
            <tr>
              {normalizedCols.map((col) => (
                <th
                  key={col.id}
                  className={`lv-th ${col.className || ""}`}
                  style={{ width: widths[col.id] ? `${widths[col.id]}px` : undefined }}
                >
                  <div className="lv-th-inner">
                    <span className="lv-th-label">{col.header}</span>
                    <span className="lv-resizer" onMouseDown={(e) => startResize(col.id, e)} />
                  </div>
                </th>
              ))}
              {actions?.length ? (
                <th className="lv-th lv-th-actions sticky-right">
                  <div className="lv-th-inner">
                    <span className="lv-th-label">Actions</span>
                  </div>
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {paged.map((row, idx) => (
              <tr key={row.id ?? idx}>
                {normalizedCols.map((col) => (
                  <td
                    key={col.id}
                    className={`lv-td ${col.className || ""}`}
                    style={{ width: widths[col.id] ? `${widths[col.id]}px` : undefined }}
                  >
                    {getCellContent(row, col)}
                  </td>
                ))}
                {actions?.length ? (
                  <td className="lv-td sticky-right lv-td-actions">
                    <div className="lv-actions-inline">
                      {actions.map((act, i) => (
                        <button
                          key={i}
                          className={`icon-btn simple ${act.type === "delete" ? "danger" : act.type === "edit" ? "accent" : ""}`}
                          title={act.title || act.label}
                          onClick={() => act.onClick?.(row._raw ?? row)}
                          aria-label={act.title || act.label}
                        >
                          {act.icon}
                        </button>
                      ))}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}

            {!paged.length && (
              <tr>
                <td className="lv-empty" colSpan={normalizedCols.length + (actions?.length ? 1 : 0)}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="lv-table-pager">
        <button className="pill-btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ‹ Prev
        </button>
        <span className="pager-text">Page {page} of {totalPages}</span>
        <button className="pill-btn ghost sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next ›
        </button>
      </div>
    </div>
  );
}
```

## resources/js/lib/api.js

```js
// resources/js/lib/api.js
import { alertInfo } from "../utils/alerts";

const API_BASE = "/api";
const LS_KEY = "lv_token";
const STORE_KEY = "lv_token_store"; // "local" or "session"

// -----------------------------
// OTP & Auth helper requests
// -----------------------------
export const requestRegisterOtp = (body) =>
  api("/auth/register/request-otp", { method: "POST", body, auth: false });
export const verifyRegisterOtp = (body) =>
  api("/auth/register/verify-otp", { method: "POST", body, auth: false });

export const requestForgotOtp = (body) =>
  api("/auth/forgot/request-otp", { method: "POST", body, auth: false });
export const verifyForgotOtp = (body) =>
  api("/auth/forgot/verify-otp", { method: "POST", body, auth: false });
export const resetWithTicket = (body) =>
  api("/auth/forgot/reset", { method: "POST", body, auth: false });

export const resendOtp = (body) =>
  api("/auth/otp/resend", { method: "POST", body, auth: false });

// -----------------------------
// Token storage
// -----------------------------
function notifyAuthChange() {
  try {
    window.dispatchEvent(new CustomEvent("lv-auth-change"));
  } catch {}
}

export function getToken() {
  const store = localStorage.getItem(STORE_KEY) || "local";
  return store === "session"
    ? sessionStorage.getItem(LS_KEY)
    : localStorage.getItem(LS_KEY);
}

export function setToken(tok, { remember = false } = {}) {
  try {
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(LS_KEY);
  } catch {}
  if (remember) {
    localStorage.setItem(LS_KEY, tok);
    localStorage.setItem(STORE_KEY, "local");
  } else {
    sessionStorage.setItem(LS_KEY, tok);
    localStorage.setItem(STORE_KEY, "session");
  }
  notifyAuthChange();
}

export function clearToken() {
  try {
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(LS_KEY);
    localStorage.removeItem(STORE_KEY);
  } catch {}
  notifyAuthChange();
}

// -----------------------------
// Core fetch wrapper
// -----------------------------
export async function api(
  path,
  { method = "GET", body, headers = {}, auth = true } = {}
) {
  const hadToken = !!getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    // Only show the alert if we *were* authenticated previously
    if (hadToken && !window.__lv401Shown) {
      window.__lv401Shown = true;
      alertInfo("Session expired", "Please sign in again.");
    }
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }

  return res.json().catch(() => ({}));
}

// -----------------------------
// Default export (Axios-like API)
// -----------------------------
const apiWrapper = {
  get: (url, config = {}) =>
    api(
      url +
        (config.params
          ? "?" + new URLSearchParams(config.params).toString()
          : ""),
      { method: "GET", ...config }
    ),
  post: (url, body, config = {}) =>
    api(url, { method: "POST", body, ...config }),
  put: (url, body, config = {}) =>
    api(url, { method: "PUT", body, ...config }),
  delete: (url, config = {}) => api(url, { method: "DELETE", ...config }),
};

export default apiWrapper;
```

## resources/js/lib/layers.js

```js
// resources/js/lib/layers.js
import { api } from "./api";

/** Normalize array responses: array | {data: array} | {data:{data: array}} */
const pluck = (r) => {
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.data)) return r.data;
  if (Array.isArray(r?.data?.data)) return r.data.data;
  return [];
};

/** ---- Options (id, name) helpers for dropdowns ---- */
export const fetchLakeOptions = async (q = "") => {
  const qp = q ? `?q=${encodeURIComponent(q)}` : "";
  const attempts = [
    () => api(`/options/lakes${qp}`),
    () => api(`/lakes${qp}`),
  ];
  for (const tryFetch of attempts) {
    try {
      const res = await tryFetch();
      return pluck(res).map((r) => ({ id: r.id, name: r.name }));
    } catch (_) {}
  }
  return [];
};

export const fetchWatershedOptions = async (q = "") => {
  const qp = q ? `?q=${encodeURIComponent(q)}` : "";
  const attempts = [
    () => api(`/options/watersheds${qp}`),
    () => api(`/watersheds${qp}`),
  ];
  for (const tryFetch of attempts) {
    try {
      const res = await tryFetch();
      return pluck(res).map((r) => ({ id: r.id, name: r.name }));
    } catch (_) {}
  }
  return [];
};

/** ---- Layers CRUD ---- */
export const fetchLayersForBody = async (bodyType, bodyId) => {
  if (!bodyType || !bodyId) return [];
  const res = await api(
    `/layers?body_type=${encodeURIComponent(bodyType)}&body_id=${encodeURIComponent(
      bodyId
    )}&include=geom,bounds`
  );
  return pluck(res);
};

export const createLayer = (payload) => api("/layers", { method: "POST", body: payload });

export const activateLayer = (id) =>
  api(`/layers/${id}`, { method: "PATCH", body: { is_active: true } });

export const toggleLayerVisibility = (row) => {
  const next = row.visibility === "public" ? "admin" : "public";
  return api(`/layers/${row.id}`, { method: "PATCH", body: { visibility: next } });
};

export const deleteLayer = (id) => api(`/layers/${id}`, { method: "DELETE" });

/** Fetch body name for header display */
export const fetchBodyName = async (bodyType, id) => {
  try {
    if (!bodyType || !id) return "";
    if (bodyType === "lake") {
      const r = await api(`/lakes/${id}`);
      return r?.name || "";
    }
    // Watershed: no show endpoint; fetch list and find
    const ws = await api('/watersheds');
    const rows = pluck(ws);
    const found = rows.find((w) => Number(w.id) === Number(id));
    return found?.name || "";
  } catch (_) { return ""; }
};

/** Update layer metadata (no geometry) */
export const updateLayer = (id, payload) =>
  api(`/layers/${id}`, { method: 'PATCH', body: payload });

export async function setLayerDefault(layerId, isActive) {
  return api(`/layers/${layerId}/default`, {
    method: 'PATCH',
    body: { is_active: !!isActive },
  });
}
```

## resources/js/pages/AdminInterface/AdminDashboard.jsx

```jsx
// resources/js/pages/AdminInterface/AdminDashboard.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  FiHome,
  FiBriefcase,   // Organizations
  FiUsers,       // Users & Roles
  FiMap,         // Lake Catalog
  FiLayers,      // Base Layers
  FiSliders,     // Parameters & Thresholds
  FiClipboard,   // Approvals & Publishing
  FiActivity,    // Audit Logs
  FiSettings,    // System Settings
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import AdminOverview from "./AdminOverview";
import AdminOrganizations from "./AdminOrganizations";
import AdminUsers from "./AdminUsers";
import AdminWaterCat from "./adminWaterCat";
import AdminLayers from "./adminLayers";
import AdminParameters from "./adminParams";

const Page = ({ title }) => <h2>{title}</h2>;

export default function AdminDashboard() {
  const links = [
    // Overview (KPI Dashboard)
    { path: "/admin-dashboard", label: "Overview", icon: <FiHome />, exact: true },

    // Organizations
    { path: "/admin-dashboard/organizations", label: "Organizations", icon: <FiBriefcase /> },

    // Users
    { path: "/admin-dashboard/users", label: "Users", icon: <FiUsers /> },

    // Water Body Catalog
    { path: "/admin-dashboard/lakes", label: "Water Bodies", icon: <FiMap /> },

    // Base Layers
    { path: "/admin-dashboard/layers", label: "Base Layers", icon: <FiLayers /> },

    // Parameters
    { path: "/admin-dashboard/parameters", label: "Parameters", icon: <FiSliders /> },

    // System Feedback
    { path: "/admin-dashboard/feedback", label: "System Feedback", icon: <FiClipboard /> },

    // Audit Logs
    { path: "/admin-dashboard/audit", label: "Audit Logs", icon: <FiActivity /> },

    // System Settings
    { path: "/admin-dashboard/settings", label: "System Settings", icon: <FiSettings /> },
  ];

  return (
    <DashboardLayout links={links}>
      <Routes>
        {/* Overview */}
        <Route index element={<AdminOverview />} />

        {/* Organizations */}
        <Route path="organizations" element={<AdminOrganizations />} />

        {/* Users */}
        <Route path="users" element={<AdminUsers />} />

        {/* Water Body Catalog */}
        <Route path="lakes" element={<AdminWaterCat />} />

        {/* Base Layers */}
        <Route path="layers" element={<AdminLayers />} />

        {/* Parameters */}
        <Route path="parameters" element={<AdminParameters />} />

        {/* Feedback */}
        <Route path="feedback" element={<Page title="System Feedback" />} />

        {/* Audit Logs */}
        <Route path="audit" element={<Page title="Audit Logs" />} />

        {/* System Settings */}
        <Route path="settings" element={<Page title="System Settings" />} />
      </Routes>
    </DashboardLayout>
  );
}
```

## resources/js/pages/AdminInterface/adminLayers.jsx

```jsx
// resources/js/pages/AdminInterface/AdminLayers.jsx
import React, { useState } from "react";
import { FiLayers } from "react-icons/fi";
import LayerWizard from "../../components/layers/LayerWizard";
import LayerList from "../../components/layers/LayerList";

export default function AdminLayers() {
  // After a successful publish, remember which body was used
  const [lastBody, setLastBody] = useState({ type: "lake", id: "" });
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'view'

  return (
    <div className="admin-layers">
      {/* Header with right-aligned pill tabs */}
      <div className="dashboard-card" style={{ marginBottom: 12 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiLayers />
            <span>Base Layers</span>
          </div>
          <div className="org-actions-right">
            <button
              className={`pill-btn ${activeTab === 'upload' ? 'primary' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload Layer
            </button>
            <button
              className={`pill-btn ${activeTab === 'view' ? 'primary' : ''}`}
              onClick={() => setActiveTab('view')}
            >
              View Layers
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'upload' && (
        <LayerWizard
          defaultBodyType="lake"
          defaultVisibility="public"
          allowSetActive
          onPublished={(res) => {
            // Try to pick body_type/body_id from response payload shape
            // Supports {body_type, body_id} or {data:{body_type, body_id}}
            const r = res?.data ?? res ?? {};
            if (r.body_type && r.body_id) {
              setLastBody({ type: r.body_type, id: r.body_id });
            }
            // Switch to the View tab after a successful publish
            setActiveTab('view');
            console.log("Layer published:", res);
          }}
        />
      )}

      {activeTab === 'view' && (
        <LayerList
          initialBodyType={lastBody.type || "lake"}
          initialBodyId={lastBody.id || ""}
          allowActivate
          allowToggleVisibility
          allowDelete
          showPreview={false}
        />
      )}
    </div>
  );
}
```

## resources/js/pages/AdminInterface/adminLogs.jsx

```jsx

```

## resources/js/pages/AdminInterface/adminOrganizations.jsx

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import RequireRole from '../../components/RequireRole';
import OrganizationForm from '../../components/OrganizationForm';
import api from '../../lib/api';
import { alertSuccess, alertError, confirm } from '../../utils/alerts';

export default function AdminOrganizations() {
  const [tenants, setTenants] = useState([]);
  const [meta, setMeta] = useState({ total: 0, per_page: 10, current_page: 1 });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filterActive, setFilterActive] = useState(''); // '', '1', '0'
  const [perPage, setPerPage] = useState(10);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

const fetchTenants = useCallback(async (page = 1) => {
  setLoading(true);
  try {
    const res = await api.get('/admin/tenants', {
      params: {
        q: query || undefined,
        page,
        per_page: perPage,
        active: filterActive !== '' ? filterActive : undefined,
      },
    });

    // res is the whole Laravel JSON { data: [...], meta: {...} }
    setTenants(res.data ?? []);
    setMeta(res.meta ?? { total: 0, per_page: perPage, current_page: page });
  } catch (err) {
    alertError(err);
  } finally {
    setLoading(false);
  }
}, [query, filterActive, perPage]);


  useEffect(() => {
    fetchTenants(1);
  }, [fetchTenants]);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(t) {
    setEditing(t);
    setShowForm(true);
  }

 async function handleSaved(savedTenant) {
   setShowForm(false);
   // refresh from server to get latest meta & pagination
   await fetchTenants(meta.current_page || 1);
   alertSuccess(`Organization "${savedTenant.name}" saved`);
 }

  async function handleDelete(t) {
    const confirmed = await confirm({
      title: 'Delete organization?',
      text: `Are you sure you want to delete "${t.name}"? This can be restored from the deleted list.`,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/admin/tenants/${t.id}`);
      // optimistic remove
      setTenants(prev => prev.filter(x => x.id !== t.id));
      alertSuccess('Organization deleted');
      // refresh meta if needed
      fetchTenants(meta.current_page || 1);
    } catch (err) {
      alertError(err);
    }
  }

  function handleSearchChange(e) {
    setQuery(e.target.value);
  }

  function handleFilterChange(e) {
    setFilterActive(e.target.value);
  }

  function handlePageChange(page) {
    fetchTenants(page);
  }

  return (
    <RequireRole role="superadmin">
      <div className="row">
        <div className="col s12">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5>Organizations</h5>
                <p className="small">Manage organizations (tenants) — create, edit, delete, and view organizations.</p>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  placeholder="Search organizations..."
                  value={query}
                  onChange={handleSearchChange}
                  style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd' }}
                />
                <select value={filterActive} onChange={handleFilterChange} className="browser-default">
                  <option value="">All</option>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
                <button className="btn waves-effect waves-light" onClick={() => fetchTenants(1)}>Search</button>
                <button className="btn" onClick={openAdd} style={{ background: '#8e94f0' }}>Add Organization</button>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <table className="striped">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Domain</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan="6">Loading...</td></tr>
                  ) : tenants.length === 0 ? (
                    <tr><td colSpan="6">No organizations found.</td></tr>
                  ) : tenants.map(t => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>{t.domain || '—'}</td>
                      <td>{t.contact_email || t.phone || '—'}</td>
                      <td>{t.active ? <span className="chip green">Active</span> : <span className="chip grey">Inactive</span>}</td>
                      <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-flat" onClick={() => openEdit(t)} title="Edit">
                          <i className="material-icons">edit</i>
                        </button>
                        <button className="btn-flat" onClick={() => handleDelete(t)} title="Delete">
                          <i className="material-icons red-text">delete</i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <div>
                  <small>Showing page {meta.current_page} — {meta.total} total</small>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    className="browser-default"
                    value={perPage}
                    onChange={(e) => { setPerPage(Number(e.target.value)); fetchTenants(1); }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>

                  <div>
                    {/* Simple prev/next pagination */}
                    <button
                      className="btn-flat"
                      onClick={() => handlePageChange(Math.max(1, meta.current_page - 1))}
                      disabled={meta.current_page <= 1}
                    >
                      Prev
                    </button>
                    <button
                      className="btn-flat"
                      onClick={() => handlePageChange(Math.min(meta.last_page || 1, meta.current_page + 1))}
                      disabled={meta.current_page >= (meta.last_page || 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <OrganizationForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          initialData={editing}
          onSaved={handleSaved}
          api={api}
        />
      </div>
    </RequireRole>
  );
}
```

## resources/js/pages/AdminInterface/adminOverview.jsx

```jsx
// resources/js/pages/AdminInterface/AdminOverview.jsx
import React, { useMemo } from "react";
import {
  FiBriefcase,    // Organizations
  FiUsers,        // Registered Users
  FiMap,          // Lakes in Database
  FiDroplet,      // Water Quality Reports in Database
  FiActivity,     // Recent Activity header icon
} from "react-icons/fi";

import AppMap from "../../components/AppMap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

/* KPI Grid */
function KPIGrid() {
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-icon"><FiBriefcase /></div>
        <div className="kpi-info">
          <span className="kpi-title">Organizations</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiUsers /></div>
        <div className="kpi-info">
          <span className="kpi-title">Registered Users</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiMap /></div>
        <div className="kpi-info">
          <span className="kpi-title">Lakes in Database</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiDroplet /></div>
        <div className="kpi-info">
          <span className="kpi-title">Water Quality Reports in Database</span>
          <span className="kpi-value"></span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Overview Map
   (Basemap only; no markers/features preloaded.)
   ============================================================ */
function OverviewMap() {
  return (
    <div className="map-container">
      <AppMap view="osm" style={{ height: "100%", width: "100%" }}>
        {/* Add GeoJSON layers or markers once data is available */}
      </AppMap>
    </div>
  );
}

/* ============================================================
   Recent Logs
   (Empty list; render items when you have data.)
   ============================================================ */
function RecentLogs() {
  return (
    <div className="dashboard-card" style={{ marginTop: 24 }}>
      <div className="dashboard-card-title">
        <FiActivity style={{ marginRight: 8 }} />
        <span>Recent Activity</span>
      </div>
      <div className="dashboard-card-body">
        <ul className="recent-logs-list">
          {/* Intentionally empty. Map over recent logs here. */}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   Page: AdminOverview
   ============================================================ */
export default function AdminOverview() {
  return (
    <>
      <KPIGrid />
      <OverviewMap />
      <RecentLogs />
    </>
  );
}
```

## resources/js/pages/AdminInterface/adminParams.jsx

```jsx
// resources/js/pages/AdminInterface/adminParams.jsx
import React, { useMemo, useState } from "react";
import {
  FiFilter,
  FiPlus,
  FiSave,
  FiSearch,
  FiSliders,
  FiTrash2,
  FiEdit2,
} from "react-icons/fi";

import TableLayout from "../../layouts/TableLayout";

/**
 * AdminParameters
 * - Minimal MVP for creating parameters (global catalog)
 * - No backend yet: handlers show where to plug API calls
 * - Empty initial state (no mock rows)
 *
 * Parameter fields:
 * - code (e.g., DO, BOD5)
 * - name (e.g., Dissolved Oxygen)
 * - category (e.g., Physico-chemical, Nutrients, Metals, Microbiological, Biological)
 * - unit (e.g., mg/L, µg/L, NTU, °C, "pH units")
 * - description (optional)
 */
export default function AdminParameters() {
  /* ------------------------------ Form state ------------------------------ */
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "",
    unit: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  /* ------------------------------ List state ------------------------------ */
  const [params, setParams] = useState([]);           // ← start empty
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  /* ------------------------------ Derived list ---------------------------- */
  const filtered = useMemo(() => {
    let list = params;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.code?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q) ||
          p.unit?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      list = list.filter((p) => p.category === categoryFilter);
    }
    return list;
  }, [params, query, categoryFilter]);

  /* ------------------------------ Columns -------------------------------- */
  const columns = useMemo(
    () => [
      { header: "Code", accessor: "code", width: 120 },
      { header: "Name", accessor: "name" },
      { header: "Category", accessor: "category", width: 190 },
      { header: "Unit", accessor: "unit", width: 120 },
      {
        header: "Description",
        accessor: "description",
        render: (row) => row.description || "—",
      },
    ],
    []
  );

  const actions = useMemo(
    () => [
      {
        label: "Edit",
        type: "edit",
        icon: <FiEdit2 />,
        onClick: (row) => {
          // Load into form for editing
          setForm({ ...row, __editingId: row.id });
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
      {
        label: "Delete",
        type: "delete",
        icon: <FiTrash2 />,
        onClick: (row) => {
          // TODO: confirm, then call DELETE /api/parameters/:id
          setParams((prev) => prev.filter((p) => p.id !== row.id));
        },
      },
    ],
    []
  );

  /* ------------------------------ Handlers -------------------------------- */
  const resetForm = () =>
    setForm({ code: "", name: "", category: "", unit: "", description: "" });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim() || !form.unit.trim() || !form.category.trim()) {
      alert("Please complete Code, Name, Unit, and Category.");
      return;
    }

    setSaving(true);
    try {
      // TODO: replace with POST/PATCH to your API.
      // If __editingId exists → PATCH; otherwise → POST.

      if (form.__editingId) {
        setParams((prev) =>
          prev.map((p) => (p.id === form.__editingId ? { ...p, ...form } : p))
        );
      } else {
        setParams((prev) => [
          ...prev,
          { id: crypto.randomUUID(), ...form },
        ]);
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  /* ------------------------------ UI ------------------------------------- */
  return (
    <div className="dashboard-card">
      {/* Header */}
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          <FiSliders />
          <span>Parameters</span>
        </div>
      </div>

      {/* Create/Edit form */}
      <form onSubmit={handleSave} className="dashboard-card-body">
        <div className="org-form">
          <div className="form-group">
            <label>Code *</label>
            <input
              type="text"
              placeholder="e.g., DO, BOD5, pH"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>

          <div className="form-group" style={{ minWidth: 280 }}>
            <label>Name *</label>
            <input
              type="text"
              placeholder="e.g., Dissolved Oxygen"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Category *</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">Select category</option>
              <option>Physico-chemical</option>
              <option>Nutrients</option>
              <option>Metals</option>
              <option>Microbiological</option>
              <option>Biological</option>
            </select>
          </div>

          <div className="form-group">
            <label>Unit *</label>
            <input
              type="text"
              placeholder='e.g., mg/L, "pH units", NTU, °C'
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            />
          </div>

          <div className="form-group" style={{ flexBasis: "100%" }}>
            <label>Description</label>
            <input
              type="text"
              placeholder="Optional short description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button type="submit" className="pill-btn primary" disabled={saving}>
            <FiSave />
            <span className="hide-sm">{form.__editingId ? "Update" : "Save Parameter"}</span>
          </button>
          {form.__editingId ? (
            <button type="button" className="pill-btn" onClick={handleCancelEdit}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {/* Toolbar (search & filter) */}
      <div className="dashboard-card-header" style={{ marginTop: 16 }}>
        <div className="org-toolbar" style={{ gridTemplateColumns: "1fr auto auto" }}>
          <div className="org-search" style={{ minWidth: 0 }}>
            <FiSearch className="toolbar-icon" />
            <input
              type="text"
              placeholder="Search code, name, unit, category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="org-filter">
            <FiFilter className="toolbar-icon" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              <option>Physico-chemical</option>
              <option>Nutrients</option>
              <option>Metals</option>
              <option>Microbiological</option>
              <option>Biological</option>
            </select>
          </div>

          <div className="org-actions-right">
            <button type="button" className="pill-btn" onClick={() => resetForm()}>
              <FiPlus />
              <span className="hide-sm">New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Parameters table */}
      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        <div className="table-wrapper">
          <TableLayout
            columns={columns}
            data={filtered}
            pageSize={10}
            actions={actions}
          />
        </div>
      </div>
    </div>
  );
}
```

## resources/js/pages/AdminInterface/adminSettings.jsx

```jsx

```

## resources/js/pages/AdminInterface/adminUsers.jsx

```jsx
// resources/js/pages/AdminInterface/AdminUsers.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiUser,
  FiMail,
} from "react-icons/fi";

import TableLayout from "../../layouts/TableLayout"; // adjust the path if different

/**
 * AdminUsers
 * - List users with fields from Register page:
 *   full_name, email, occupation, affiliation, created_at
 * - Search + occupation filter
 * - Actions: View / Edit / Delete (placeholders)
 * - Responsive via TableLayout + table.css (no mock data)
 */
export default function AdminUsers() {
  // ---------- UI State ----------
  const [query, setQuery] = useState("");
  const [occupation, setOccupation] = useState(""); // '', 'Student', 'Researcher', 'Professional', 'Other'
  const [loading, setLoading] = useState(false);

  // ---------- Data State (empty by design) ----------
  const [users, setUsers] = useState([]); // [{ id, full_name, email, occupation, affiliation, created_at }]

  // ---------- Columns ----------
  const columns = useMemo(
    () => [
        { header: "", width: 32, className: "col-xs-hide",
        render: (row) => <input type="checkbox" aria-label={`Select ${row?.full_name ?? "row"}`} /> },

        {
        header: <span className="th-with-icon"><FiUser /> Name</span>,
        label: "Name",
        accessor: "full_name",
        },
        {
        header: <span className="th-with-icon"><FiMail /> Email</span>,
        label: "Email",
        accessor: "email",
        width: 240,
        className: "col-sm-hide",
        },
        { header: "Occupation", label: "Occupation", accessor: "occupation", width: 160 },
        { header: "Affiliation", label: "Affiliation", accessor: "affiliation", className: "col-md-hide" },
        { header: "Created", label: "Created", accessor: "created_at", width: 180, className: "col-md-hide" },
    ],
    []
    );


  // ---------- Row Actions ----------
  const actions = useMemo(
    () => [
      { label: "View", type: "default", icon: <FiEye />, onClick: (row) => { /* TODO: route to /admin-dashboard/users/:id */ } },
      { label: "Edit", type: "edit", icon: <FiEdit2 />, onClick: (row) => { /* TODO: open edit user */ } },
      { label: "Delete", type: "delete", icon: <FiTrash2 />, onClick: (row) => { /* TODO: confirm + delete */ } },
    ],
    []
  );

  // ---------- Fetch (replace with your API) ----------
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Example (replace with your backend):
      // const params = new URLSearchParams({ query, occupation });
      // const res = await fetch(`/api/admin/users?${params.toString()}`);
      // const data = await res.json();
      // setUsers(data.items ?? []);
      setUsers([]); // keep empty until wired
    } catch (e) {
      console.error("Failed to fetch users", e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [query, occupation]);

  // ---------- Handlers ----------
  const handleAdd = () => {
    // TODO: navigate to user-create or open modal
  };

  return (
    <div className="dashboard-card">
      {/* Toolbar (reuses org-toolbar styles) */}
      <div className="dashboard-card-header org-toolbar">
        <div className="org-search">
          <FiSearch className="toolbar-icon" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search users"
          />
        </div>

        <div className="org-filter">
          <FiFilter className="toolbar-icon" />
          <select
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            aria-label="Filter by occupation"
          >
            <option value="">All Occupations</option>
            <option value="Student">Student</option>
            <option value="Researcher">Researcher</option>
            <option value="Professional">Professional</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="org-actions-right">
          <button
            className="pill-btn ghost"
            onClick={fetchUsers}
            title="Refresh"
            aria-label="Refresh users list"
          >
            <FiRefreshCw />
          </button>
          <button
            className="pill-btn primary"
            onClick={handleAdd}
            title="Add user"
          >
            <FiPlus />
            <span className="hide-sm">Add</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        {loading && <div className="no-data" style={{ paddingTop: 8 }}>Loading…</div>}

        <div className="table-wrapper">
          <TableLayout
            columns={columns}
            data={users}
            pageSize={10}
            actions={actions}
          />
        </div>
      </div>
    </div>
  );
}
```

## resources/js/pages/AdminInterface/adminWaterCat.jsx

```jsx
// resources/js/pages/AdminInterface/AdminWaterCat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiEye, FiEdit2, FiTrash2, FiMap, FiLayers } from "react-icons/fi";
import { GeoJSON } from "react-leaflet";
import AppMap from "../../components/AppMap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import TableLayout from "../../layouts/TableLayout";
import { api } from "../../lib/api";
import LakeForm from "../../components/LakeForm";
import ConfirmDialog from "../../components/ConfirmDialog";
import TableToolbar from "../../components/table/TableToolbar";
import FilterPanel from "../../components/table/FilterPanel";

// Leaflet marker asset fix
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const TABLE_ID = "admin-watercat-lakes";
const VIS_KEY  = `${TABLE_ID}::visible`;
const ADV_KEY  = `${TABLE_ID}::filters_advanced`;

export default function AdminWaterCat() {
  /* ----------------------------- Basic toolbar state ----------------------------- */
  const [query, setQuery] = useState(() => {
    try { return localStorage.getItem(`${TABLE_ID}::search`) || ""; } catch { return ""; }
  });

  /* ----------------------------- Core state ----------------------------- */
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [allLakes, setAllLakes] = useState([]);
  const [lakes, setLakes] = useState([]);
  const [watersheds, setWatersheds] = useState([]);

  /* ----------------------------- Map ----------------------------- */
  const mapRef = useRef(null);
  const lakeGeoRef = useRef(null);
  const [showLakePoly, setShowLakePoly] = useState(false);
  const [showWatershed, setShowWatershed] = useState(false);
  const [showInflow, setShowInflow] = useState(false);
  const [showOutflow, setShowOutflow] = useState(false);
  const [lakeFeature, setLakeFeature] = useState(null);
  const [lakeBounds, setLakeBounds] = useState(null);
  // Initial view handled by AppMap (Philippines extent)

  /* ----------------------------- Modals ----------------------------- */
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formInitial, setFormInitial] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  /* ----------------------------- Columns ----------------------------- */
  const baseColumns = useMemo(() => ([
    { id: "name", header: "Name", accessor: "name" },
    { id: "alt_name", header: "Other Name", accessor: "alt_name", width: 180, render: (r) => (r.alt_name ? <em>{r.alt_name}</em> : "") },
    { id: "region", header: "Region", accessor: "region", width: 140, className: "col-md-hide" },
    { id: "province", header: "Province", accessor: "province", width: 160, className: "col-md-hide" },
    { id: "municipality", header: "Municipality", accessor: "municipality", width: 180, className: "col-sm-hide" },
    { id: "surface_area_km2", header: "Surface Area (km²)", accessor: "surface_area_km2", width: 170, className: "col-sm-hide" },
    // Optional/toggleable:
    { id: "elevation_m", header: "Elevation (m)", accessor: "elevation_m", width: 150, className: "col-md-hide", _optional: true },
    { id: "mean_depth_m", header: "Mean Depth (m)", accessor: "mean_depth_m", width: 160, className: "col-md-hide", _optional: true },
    { id: "watershed", header: "Watershed", accessor: "watershed", width: 220, _optional: true },
    { id: "created_at", header: "Created", accessor: "created_at", width: 140, className: "col-md-hide", _optional: true },
    { id: "updated_at", header: "Updated", accessor: "updated_at", width: 140, className: "col-sm-hide", _optional: true },
  ]), []);

  const defaultsVisible = useMemo(() => {
    const on = { name: true, alt_name: true, region: true, province: true, municipality: true, surface_area_km2: true };
    baseColumns.forEach(c => { if (!(c.id in on)) on[c.id] = false; });
    return on;
  }, [baseColumns]);

  const [visibleMap, setVisibleMap] = useState(() => {
    try {
      const raw = localStorage.getItem(VIS_KEY);
      return raw ? JSON.parse(raw) : defaultsVisible;
    } catch { return defaultsVisible; }
  });
  useEffect(() => { try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {} }, [visibleMap]);

  const visibleColumns = useMemo(() => baseColumns.filter(c => visibleMap[c.id] !== false), [baseColumns, visibleMap]);

  // Reset widths trigger for TableLayout
  const [resetSignal, setResetSignal] = useState(0);
  const triggerResetWidths = () => setResetSignal(n => n + 1);

  /* ----------------------------- Advanced Filters ----------------------------- */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adv, setAdv] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ADV_KEY)) || {}; } catch { return {}; }
  });

  const activeFilterCount = useMemo(() => {
    let c = 0;
    for (const [, v] of Object.entries(adv)) {
      if (Array.isArray(v)) { if (v.some(x => x !== null && x !== "" && x !== undefined)) c++; }
      else if (v !== null && v !== "" && v !== undefined && !(typeof v === "boolean" && v === false)) c++;
    }
    return c;
  }, [adv]);

  useEffect(() => { try { localStorage.setItem(ADV_KEY, JSON.stringify(adv)); } catch {} }, [adv]);

  /* ----------------------------- Formatting helpers ----------------------------- */
  const fmtNum = (v, d = 2) => (v === null || v === undefined || v === "" ? "" : Number(v).toFixed(d));
  const fmtDt  = (v) => (v ? new Date(v).toLocaleDateString() : "");
  const formatLocation = (r) => [r.municipality, r.province, r.region].filter(Boolean).join(", ");

  const normalizeRows = (rows) =>
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      alt_name: r.alt_name ?? "",
      region: r.region ?? "",
      province: r.province ?? "",
      municipality: r.municipality ?? "",
      surface_area_km2: fmtNum(r.surface_area_km2, 2),
      elevation_m: fmtNum(r.elevation_m, 1),
      mean_depth_m: fmtNum(r.mean_depth_m, 1),
      // max_depth_m removed
      watershed: r.watershed?.name ?? "",
      created_at: fmtDt(r.created_at),
      updated_at: fmtDt(r.updated_at),
      location: formatLocation(r),
      _raw: r,
    }));

  /* ----------------------------- Fetchers ----------------------------- */
  const fetchWatersheds = async () => {
    try {
      const ws = await api("/watersheds");
      setWatersheds(Array.isArray(ws) ? ws : []);
    } catch { setWatersheds([]); }
  };
  const fetchLakes = async () => {
    setLoading(true); setErrorMsg("");
    try {
      const data = await api("/lakes");
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setAllLakes(normalizeRows(list));
    } catch (e) {
      console.error(e); setErrorMsg("Failed to load lakes."); setAllLakes([]);
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchWatersheds(); fetchLakes(); }, []);

  /* ----------------------------- Apply filters ----------------------------- */
  useEffect(() => {
    const q = query.trim().toLowerCase();

    const reg  = (adv.region ?? "").toLowerCase();
    const prov = (adv.province ?? "").toLowerCase();
    const muni = (adv.municipality ?? "").toLowerCase();

    const [minArea, maxArea]   = adv.area_km2    ?? [null, null];
    const [minEl,   maxEl]     = adv.elevation_m ?? [null, null];
    const [minMd,   maxMd]     = adv.mean_depth_m ?? [null, null];

    const filtered = allLakes.filter((row) => {
      const hay = `${row.name} ${row.alt_name || ""} ${row.location} ${row.watershed}`.toLowerCase();

      if (q && !hay.includes(q)) return false;
      if (reg  && (row.region || "").toLowerCase()       !== reg) return false;
      if (prov && (row.province || "").toLowerCase()     !== prov) return false;
      if (muni && (row.municipality || "").toLowerCase() !== muni) return false;

      const area = row._raw?.surface_area_km2 ?? null;
      if (minArea != null && !(area != null && Number(area) >= Number(minArea))) return false;
      if (maxArea != null && !(area != null && Number(area) <= Number(maxArea))) return false;

      const elv = row._raw?.elevation_m ?? null;
      if (minEl != null && !(elv != null && Number(elv) >= Number(minEl))) return false;
      if (maxEl != null && !(elv != null && Number(elv) <= Number(maxEl))) return false;

      const md = row._raw?.mean_depth_m ?? null;
      if (minMd != null && !(md != null && Number(md) >= Number(minMd))) return false;
      if (maxMd != null && !(md != null && Number(md) <= Number(maxMd))) return false;

      // max_depth_m removed

      return true;
    });

    setLakes(filtered);
  }, [allLakes, query, adv]);

  /* ----------------------------- Map fit on selected bounds ----------------------------- */
  useEffect(() => {
    if (!mapRef.current || !lakeBounds) return;
    // Teleport to bounds that fit the lake entirely; limit over-zoom
    mapRef.current.fitBounds(lakeBounds, { padding: [24, 24], maxZoom: 14, animate: false });
  }, [lakeBounds]);

  // Bring polygon to front after render (nice visual emphasis)
  useEffect(() => {
    if (lakeGeoRef.current && showLakePoly) {
      try { lakeGeoRef.current.bringToFront(); } catch {}
    }
  }, [lakeFeature, showLakePoly]);

  /* ----------------------------- Row actions ----------------------------- */
  const viewLake = async (row) => {
    const id = row?.id ?? row?._raw?.id; if (!id) return;
    setLoading(true); setErrorMsg("");
    try {
      const detail = await api(`/lakes/${id}`);
      let feature = null;
      if (detail?.geom_geojson) { try { feature = JSON.parse(detail.geom_geojson); } catch {} }
      setLakeFeature(feature);

      if (feature) {
        const layer = L.geoJSON(feature);
        const b = layer.getBounds();
        if (b?.isValid?.() === true) {
          setLakeBounds(b);
          setShowLakePoly(true); // ensure visible when clicking View
        } else {
          setLakeBounds(null);
        }
      } else {
        setLakeBounds(null);
      }
    } catch (e) {
      console.error(e); setErrorMsg("Failed to load lake details.");
      setLakeFeature(null); setLakeBounds(null);
    } finally { setLoading(false); }
  };

  const openCreate = () => { setFormMode("create"); setFormInitial({}); setFormOpen(true); };
  const openEdit = (row) => {
    const r = row?._raw ?? row;
    setFormMode("edit");
    setFormInitial({
      id: r.id, name: r.name ?? "", region: r.region ?? "", province: r.province ?? "",
      municipality: r.municipality ?? "", watershed_id: r._raw?.watershed_id ?? r.watershed_id ?? "",
      surface_area_km2: r._raw?.surface_area_km2 ?? r.surface_area_km2 ?? "",
      elevation_m: r._raw?.elevation_m ?? r.elevation_m ?? "",
      mean_depth_m: r._raw?.mean_depth_m ?? r.mean_depth_m ?? "",
      // max_depth_m removed
      alt_name: r.alt_name ?? "",
    });
    setFormOpen(true);
  };
  const openDelete = (row) => { setConfirmTarget(row?._raw ?? row); setConfirmOpen(true); };

  const actions = useMemo(() => [
    { label: "View",   title: "View",   icon: <FiEye />,   onClick: viewLake },
    { label: "Edit",   title: "Edit",   icon: <FiEdit2 />, onClick: openEdit,  type: "edit" },
    { label: "Delete", title: "Delete", icon: <FiTrash2 />,onClick: openDelete, type: "delete" },
  ], []);

  /* ----------------------------- Save/Delete ----------------------------- */
  const parsePayload = (src) => {
    const nx = { ...src };
    ["surface_area_km2","elevation_m","mean_depth_m","watershed_id"].forEach((k) => {
      nx[k] = nx[k] === "" || nx[k] === null || nx[k] === undefined ? null : Number(nx[k]);
      if (Number.isNaN(nx[k])) nx[k] = null;
    });
    ["name","alt_name","region","province","municipality"].forEach((k) => nx[k] = (nx[k] ?? "").toString().trim() || null);
    return nx;
  };
  const saveLake = async (formObj) => {
    const payload = parsePayload(formObj);
    setLoading(true); setErrorMsg("");
    try {
      if (formMode === "create") await api("/lakes", { method: "POST", body: payload });
      else await api(`/lakes/${payload.id}`, { method: "PUT", body: payload });
      setFormOpen(false);
      await fetchLakes();
    } catch (e) {
      console.error(e); setErrorMsg("Save failed. Please check required fields and uniqueness of name.");
    } finally { setLoading(false); }
  };
  const deleteLake = async () => {
    if (!confirmTarget?.id) { setConfirmOpen(false); return; }
    setLoading(true); setErrorMsg("");
    try {
      await api(`/lakes/${confirmTarget.id}`, { method: "DELETE" });
      setConfirmOpen(false); setConfirmTarget(null);
      await fetchLakes();
    } catch (e) {
      console.error(e); setErrorMsg("Delete failed. This lake may be referenced by other records.");
    } finally { setLoading(false); }
  };

  /* ----------------------------- CSV Export ----------------------------- */
  const exportCsv = () => {
    const cols = visibleColumns;
    const headers = cols.map(c => (typeof c.header === "string" ? c.header : c.id));
    const rows = lakes.map(row =>
      cols.map(c => {
        const v = row[c.accessor] ?? "";
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lakes.csv";
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  };

  /* ----------------------------- Options for selects ----------------------------- */
  const regionOptions = useMemo(
    () => ["", ...new Set(allLakes.map(r => r.region).filter(Boolean))].map(v => ({ value: v, label: v || "All Regions" })),
    [allLakes]
  );
  const provinceOptions = useMemo(
    () => ["", ...new Set(allLakes.map(r => r.province).filter(Boolean))].map(v => ({ value: v, label: v || "All Provinces" })),
    [allLakes]
  );
  const municipalityOptions = useMemo(
    () => ["", ...new Set(allLakes.map(r => r.municipality).filter(Boolean))].map(v => ({ value: v, label: v || "All Municipalities/Cities" })),
    [allLakes]
  );

  /* ----------------------------- Render ----------------------------- */
  return (
    <div className="dashboard-card">
      {/* Reusable Toolbar (no basic filters now to keep it clean) */}
      <TableToolbar
        tableId={TABLE_ID}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search lakes by name, alt name, location, watershed…",
        }}
        filters={[]}
        columnPicker={{ columns: baseColumns, visibleMap, onVisibleChange: setVisibleMap }}
        onResetWidths={triggerResetWidths}
        onRefresh={fetchLakes}
        onExport={exportCsv}
        onAdd={() => openCreate()}
        onToggleFilters={() => setFiltersOpen(v => !v)}
        filtersBadgeCount={activeFilterCount}
      />

      {/* Advanced Filters (below toolbar, above table) */}
      <FilterPanel
        open={filtersOpen}
        onClearAll={() => setAdv({})}
        fields={[
          {
            id: "region",
            label: "Region",
            type: "select",
            value: adv.region ?? "",
            onChange: (v) => setAdv((s) => ({ ...s, region: v })),
            options: regionOptions,
          },
          {
            id: "province",
            label: "Province",
            type: "select",
            value: adv.province ?? "",
            onChange: (v) => setAdv((s) => ({ ...s, province: v })),
            options: provinceOptions,
          },
          {
            id: "municipality",
            label: "Municipality/City",
            type: "select",
            value: adv.municipality ?? "",
            onChange: (v) => setAdv((s) => ({ ...s, municipality: v })),
            options: municipalityOptions,
          },
          {
            id: "area_km2",
            label: "Surface Area (km²)",
            type: "number-range",
            value: adv.area_km2 ?? [null, null],
            onChange: (range) => setAdv((s) => ({ ...s, area_km2: range })),
          },
          {
            id: "elevation_m",
            label: "Elevation (m)",
            type: "number-range",
            value: adv.elevation_m ?? [null, null],
            onChange: (range) => setAdv((s) => ({ ...s, elevation_m: range })),
          },
          {
            id: "mean_depth_m",
            label: "Mean Depth (m)",
            type: "number-range",
            value: adv.mean_depth_m ?? [null, null],
            onChange: (range) => setAdv((s) => ({ ...s, mean_depth_m: range })),
          },
          // NOTE: watershed checkbox removed as requested
        ]}
      />

      {/* Table */}
      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        {loading && <div className="no-data">Loading…</div>}
        {!loading && errorMsg && <div className="no-data">{errorMsg}</div>}
        <div className="table-wrapper">
          <TableLayout
            tableId={TABLE_ID}
            columns={visibleColumns}
            data={lakes}
            pageSize={10}
            actions={actions}
            resetSignal={resetSignal}
          />
        </div>
      </div>

      {/* Map + toggles */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#374151" }}>
            <FiLayers /> Layers
          </span>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showLakePoly} onChange={(e) => setShowLakePoly(e.target.checked)} />
            Lake polygon
          </label>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showWatershed} onChange={(e) => setShowWatershed(e.target.checked)} />
            Watershed
          </label>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showInflow} onChange={(e) => setShowInflow(e.target.checked)} />
            Inflow markers
          </label>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showOutflow} onChange={(e) => setShowOutflow(e.target.checked)} />
            Outflow markers
          </label>
        </div>

        <div style={{ height: 500, borderRadius: 12, overflow: "hidden" }}>
          <AppMap
            view="osm"
            style={{ height: "100%", width: "100%" }}
            whenCreated={(map) => (mapRef.current = map)}
          >
            {showLakePoly && lakeFeature ? (
              <GeoJSON
                ref={lakeGeoRef}
                key={JSON.stringify(lakeFeature).length}
                data={lakeFeature}
                style={{ weight: 2, color: "#2563eb", fillOpacity: 0.1 }}
              />
            ) : null}
          </AppMap>
        </div>
      </div>

      {/* Modals */}
      <LakeForm
        open={formOpen}
        mode={formMode}
        initialValue={formInitial}
        watersheds={watersheds}
        loading={loading}
        onSubmit={saveLake}
        onCancel={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Lake"
        message={`Are you sure you want to delete "${confirmTarget?.name ?? "this lake"}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={deleteLake}
        onCancel={() => setConfirmOpen(false)}
        loading={loading}
      />
    </div>
  );
}
```

## resources/js/pages/ContributorInterface/ContributorDashboard.jsx

```jsx
// resources/js/pages/ContributorInterface/ContributorDashboard.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  FiHome,          // Overview
  FiMap,           // Lakes
  FiLayers,        // My Layers
  FiUploadCloud,   // Uploads
  FiClipboard,     // Submissions
  FiDroplet,       // Test Results / Sampling
  FiBell,          // Notifications
  FiActivity,      // Activity
  FiUser,          // Profile
  FiSettings,      // Settings
  FiLifeBuoy,      // Help
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";

const Page = ({ title }) => <h2>{title}</h2>;

export default function ContributorDashboard() {
  const links = [
    // Overview (KPI Dashboard)
    { path: "/contrib-dashboard", label: "Overview", icon: <FiHome />, exact: true },

    // Water Bodies
    { path: "/contrib-dashboard/lakes", label: "Water Bodies", icon: <FiMap /> },

    // Data & layers owned by contributor
    { path: "/contrib-dashboard/my-layers", label: "My Layers", icon: <FiLayers /> },

    // Upload wizard / ingestion (limited scope)
    { path: "/contrib-dashboard/uploads", label: "Uploads", icon: <FiUploadCloud /> },

    // Test results (sampling forms, drafts)
    { path: "/contrib-dashboard/test-results", label: "Test Results", icon: <FiDroplet /> },

    // Submissions (pending/approved/rejected)
    { path: "/contrib-dashboard/submissions", label: "Submissions", icon: <FiClipboard /> },

    // Notifications
    { path: "/contrib-dashboard/notifications", label: "Notifications", icon: <FiBell /> },

    // Activity (own actions/audit-lite)
    { path: "/contrib-dashboard/activity", label: "Activity", icon: <FiActivity /> },

    // Profile & Settings
    { path: "/contrib-dashboard/profile", label: "Profile", icon: <FiUser /> },
    { path: "/contrib-dashboard/settings", label: "Settings", icon: <FiSettings /> },

    // Help/Docs
    { path: "/contrib-dashboard/help", label: "Help", icon: <FiLifeBuoy /> },
  ];

  return (
    <DashboardLayout
      links={links}
    >
      <Routes>
        {/* Overview */}
        <Route index element={<Page title="Overview" />} />

        {/* Water Bodies */}
        <Route path="lakes" element={<Page title="Water Bodies" />} />

        {/* My Layers */}
        <Route path="my-layers" element={<Page title="My Layers" />} />

        {/* Uploads */}
        <Route path="uploads" element={<Page title="Uploads" />} />

        {/* Test Results */}
        <Route path="test-results" element={<Page title="Test Results" />} />

        {/* Submissions */}
        <Route path="submissions" element={<Page title="Submissions" />} />

        {/* Notifications */}
        <Route path="notifications" element={<Page title="Notifications" />} />

        {/* Activity */}
        <Route path="activity" element={<Page title="Activity" />} />

        {/* Profile & Settings */}
        <Route path="profile" element={<Page title="Profile" />} />
        <Route path="settings" element={<Page title="Settings" />} />

        {/* Help */}
        <Route path="help" element={<Page title="Help" />} />
      </Routes>
    </DashboardLayout>
  );
}
```

## resources/js/pages/OrgInterface/OrgDashboard.jsx

```jsx
// resources/js/pages/OrgInterface/OrgDashboard.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiPlusCircle,
  FiLayers,
  FiClipboard,
  FiFlag,
  FiSettings,
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import OrgOverview from "./orgOverview";
import OrgLogTest from "./orgLogTest";
import OrgMembers from "./orgMembers";
import OrgLayers from "./orgLayers";

const Page = ({ title }) => <h2>{title}</h2>;

export default function OrgDashboard() {
  const links = [
    { path: "/org-dashboard", label: "Overview", icon: <FiHome />, exact: true },
    { path: "/org-dashboard/members", label: "Members", icon: <FiUsers /> },
    { path: "/org-dashboard/log", label: "Log Test", icon: <FiPlusCircle /> },
    { path: "/org-dashboard/layers", label: "Layers", icon: <FiLayers /> },
    { path: "/org-dashboard/approvals", label: "Approvals", icon: <FiClipboard /> },
    { path: "/org-dashboard/alerts", label: "Alerts", icon: <FiFlag /> },
    { path: "/org-dashboard/settings", label: "Settings", icon: <FiSettings /> },
  ];

  return (
    <DashboardLayout links={links}>
      <Routes>
        <Route index element={<OrgOverview />} />
        <Route path="members" element={<OrgMembers />} />
        <Route path="log" element={<OrgLogTest />} />
        <Route path="layers" element={<OrgLayers />} />
        <Route path="approvals" element={<Page title="Approvals & Reviews" />} />
        <Route path="alerts" element={<Page title="Org Alerts" />} />
        <Route path="settings" element={<Page title="Settings" />} />
      </Routes>
    </DashboardLayout>
  );
}
```

## resources/js/pages/OrgInterface/orgLayers.jsx

```jsx
// resources/js/pages/OrgInterface/OrgLayers.jsx
import React from "react";
import {
  FiUploadCloud,
  FiLayers,
  FiCheckCircle,
  FiAlertTriangle,
  FiGlobe,
  FiMap,
  FiInfo,
  FiShield,
  FiUsers,
} from "react-icons/fi";

import Wizard from "../../components/Wizard";

/**
 * OrgLayers (scaffold)
 * - Organization-scoped vector layer importer (same UX as Admin, but org-specific rules)
 * - Vector-only: .gpkg, .geojson/.json, .kml, .zip (zipped Shapefile)
 * - No client parsing / map preview in this scaffold (wire to backend later)
 * - Default visibility: Organization
 * - If "Public" is selected, treat as "Submit for admin approval"
 * - Link to a lake (limited to lakes your org manages; populate when backend is ready)
 * - No canNext preconditions so you can step through the entire wizard
 */
export default function OrgLayers() {
  const steps = [
    /* -------------------------------- Step 1 -------------------------------- */
    {
      key: "upload",
      title: "Upload",
      render: ({ data, setData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiUploadCloud />
              <span>Upload or Drag & Drop</span>
            </div>
          </div>

          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = [...e.dataTransfer.files].filter((f) =>
                /\.(gpkg|geojson|json|kml|zip)$/i.test(f.name)
              );
              setData({ ...data, files });
              // TODO: POST to /api/org/layers/stage to upload & introspect inner layers
            }}
          >
            <p>Drop files here or click to select</p>
            <small>Accepted: .gpkg, .geojson, .json, .kml, .zip (zipped Shapefile)</small>
            <input
              type="file"
              multiple
              accept=".gpkg,.geojson,.json,.kml,.zip"
              onChange={(e) => {
                const files = [...e.target.files];
                setData({ ...data, files });
                // TODO: POST to /api/org/layers/stage to upload & introspect inner layers
              }}
            />
          </div>

          <div className="file-list">
            {!data?.files?.length ? (
              <div className="no-data">No files added</div>
            ) : (
              data.files.map((f, i) => (
                <div key={i} className="file-row">
                  <FiMap />
                  <span className="file-name" title={f.name}>
                    {f.name}
                  </span>
                  <button
                    className="action-btn delete"
                    onClick={() => {
                      const copy = [...data.files];
                      copy.splice(i, 1);
                      setData({ ...data, files: copy });
                    }}
                    title="Remove"
                  >
                    <span>Remove</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ),
      // canNext omitted on purpose so you can step through
    },

    /* ------------------------------ Step 2: Select Layers ------------------- */
    {
      key: "select",
      title: "Select Layers",
      render: ({ data, setData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiLayers />
              <span>Select Layers from Files</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            {!data?.detectedLayers?.length ? (
              <div className="no-data">
                No inner layers detected yet.
                <br />
                <small>These will appear once the backend inspects your uploads.</small>
              </div>
            ) : (
              <ul className="layer-list">
                {data.detectedLayers.map((lyr) => {
                  const selected = new Set(data.selectedLayerIds || []);
                  const isChecked = selected.has(lyr.id);
                  return (
                    <li key={lyr.id} className="layer-row">
                      <label>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) selected.delete(lyr.id);
                            else selected.add(lyr.id);
                            setData({ ...data, selectedLayerIds: Array.from(selected) });
                          }}
                        />
                        <span className="layer-name">{lyr.name}</span>
                      </label>
                      <span className="layer-meta">
                        {lyr.geomType || "Unknown"}{/* • {lyr.srid || "EPSG:4326"} */}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ),
    },

    /* ------------------------------ Step 3: Validate & CRS ------------------ */
    {
      key: "validate",
      title: "Validate & CRS",
      render: ({ data, setData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiCheckCircle />
              <span>Validate & Coordinate System</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="info-row">
              <FiInfo /> All layers will be reprojected to <strong>EPSG:4326</strong> (WGS84 lat/lon).
            </div>

            <label className="auth-checkbox" style={{ marginTop: 12 }}>
              <input
                type="checkbox"
                checked={!!data?.fixInvalidGeoms}
                onChange={(e) => setData({ ...data, fixInvalidGeoms: e.target.checked })}
              />
              <span>Attempt to fix invalid geometries (self-intersections, rings, etc.)</span>
            </label>

            <div className="alert-note">
              <FiAlertTriangle /> Shapefiles must be uploaded as <strong>.zip</strong> with
              <code> .shp/.shx/.dbf/.prj</code>. If <code>.prj</code> is missing, you’ll be asked to choose the CRS.
            </div>

            <div className="info-row" style={{ marginTop: 8 }}>
              <FiShield /> Organization layers are stored in your org workspace/namespace. Admins may promote or
              mirror layers into global “Base Layers” if requested.
            </div>
          </div>
        </div>
      ),
    },

    /* ------------------------------ Step 4: Link to Lake -------------------- */
    {
      key: "link",
      title: "Link to Lake",
      render: ({ data, setData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiMap />
              <span>Link to a Lake (Your Org)</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <p>Select the lake this layer belongs to. (Required)</p>
            <select
              value={data?.lakeId || ""}
              onChange={(e) => setData({ ...data, lakeId: e.target.value })}
              className="select-lg"
              aria-label="Select lake"
            >
              <option value="">Choose a lake…</option>
              {/* TODO: populate from /api/org/lakes (org-owned/managed lakes) */}
            </select>

            <div className="info-row" style={{ marginTop: 8 }}>
              <FiInfo /> Geometry editing of lakes/watersheds/stations is handled on a dedicated page.
            </div>
          </div>
        </div>
      ),
    },

    /* ------------------------------ Step 5: Metadata & Publish -------------- */
    {
      key: "meta",
      title: "Metadata & Publish",
      render: ({ data, setData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiGlobe />
              <span>Metadata & Publish</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              <div className="form-group">
                <label>Layer Name</label>
                <input
                  type="text"
                  value={data?.layerName || ""}
                  onChange={(e) => setData({ ...data, layerName: e.target.value })}
                  placeholder="e.g., Org lake polygons"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={data?.category || "Hydrology"}
                  onChange={(e) => setData({ ...data, category: e.target.value })}
                >
                  <option>Hydrology</option>
                  <option>Monitoring</option>
                  <option>Administrative</option>
                  <option>Boundaries</option>
                  <option>Reference</option>
                </select>
              </div>

              <div className="form-group" style={{ flexBasis: "100%" }}>
                <label>Description</label>
                <input
                  type="text"
                  value={data?.layerDesc || ""}
                  onChange={(e) => setData({ ...data, layerDesc: e.target.value })}
                  placeholder="Short description / source credits"
                />
              </div>
            </div>

            <div className="org-form" style={{ marginTop: 8 }}>
              <div className="form-group">
                <label>Visibility</label>
                <select
                  value={data?.visibility || "org"}
                  onChange={(e) => setData({ ...data, visibility: e.target.value })}
                >
                  <option value="org">Organization (default)</option>
                  <option value="public">Public (requires admin approval)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Share with</label>
                <select
                  value={data?.shareScope || "members"}
                  onChange={(e) => setData({ ...data, shareScope: e.target.value })}
                >
                  <option value="members">Org Members</option>
                  <option value="managers">Org Managers Only</option>
                </select>
              </div>

              <div className="form-group">
                <label>Publish Strategy</label>
                <select value="overwrite" disabled>
                  <option value="overwrite">Overwrite existing (within org workspace)</option>
                </select>
              </div>
            </div>

            {data?.visibility === "public" && (
              <div className="alert-note" style={{ marginTop: 8 }}>
                <FiUsers /> Choosing <strong>Public</strong> will submit this layer for admin review. It will become
                visible on the public map after approval.
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <Wizard
      steps={steps}
      initialData={{
        files: [],
        detectedLayers: [],       // to be populated by backend after upload
        selectedLayerIds: [],
        fixInvalidGeoms: true,
        lakeId: "",
        layerName: "",
        layerDesc: "",
        category: "Hydrology",
        visibility: "org",        // org by default
        shareScope: "members",    // org members by default
      }}
      labels={{
        back: "Back",
        next: "Next",
        finish: (data) => (data?.visibility === "public" ? "Submit for Approval" : "Publish to Org"),
      }}
      onFinish={(payload) => {
        // TODO:
        // - If payload.visibility === "public": POST /api/org/layers/submit-for-approval
        // - Else: POST /api/org/layers/publish
        console.log("Org layer publish/submit payload (scaffold):", payload);
        alert(
          payload.visibility === "public"
            ? "Submitted for admin approval (scaffold). Wire to backend when ready."
            : "Published to your org workspace (scaffold). Wire to backend when ready."
        );
      }}
    />
  );
}
```

## resources/js/pages/OrgInterface/orgLogTest.jsx

```jsx
// resources/js/pages/OrgInterface/OrgLogTest.jsx 
import React, { useEffect, useMemo, useState } from "react";
import {
  FiMap, FiClock, FiList, FiPaperclip, FiCheckCircle,
  FiPlus, FiTrash2
} from "react-icons/fi";
import Wizard from "../../components/Wizard";
import TableLayout from "../../layouts/TableLayout";

export default function OrgLogTest() {
  const [lakeOptions, setLakeOptions] = useState([]);      // TODO: GET /api/lakes?org=me
  const [stationOptions, setStationOptions] = useState([]); // TODO: GET /api/stations?lake_id=
  const [paramOptions, setParamOptions] = useState([]);     // TODO: GET /api/parameters

  useEffect(() => {
    // TODO: fetch lakes & parameters on mount
    setLakeOptions([]);
    setParamOptions([]);
  }, []);

  const steps = [
    {
      key: "lake_station",
      title: "Lake & Station",
      render: ({ data, setData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title"><FiMap /><span>Lake & Station</span></div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              <div className="form-group">
                <label>Lake *</label>
                <select
                  value={data.lakeId || ""}
                  onChange={(e) => {
                    const lakeId = e.target.value;
                    setData({ ...data, lakeId, stationId: "" });
                    // TODO: load stations for lakeId
                    setStationOptions([]);
                  }}
                >
                  <option value="">Select a lake…</option>
                  {lakeOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Station *</label>
                <select
                  value={data.stationId || ""}
                  onChange={(e) => setData({ ...data, stationId: e.target.value })}
                  disabled={!data.lakeId}
                >
                  <option value="">Select a station…</option>
                  {stationOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>&nbsp;</label>
                <button type="button" className="pill-btn" disabled={!data.lakeId}
                  onClick={() => {/* TODO: open create-station modal */}}>
                  <FiPlus /> <span className="hide-sm">New Station</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      // no canNext → always allowed to proceed
    },

    {
      key: "metadata",
      title: "Sampling Metadata",
      render: ({ data, setData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title"><FiClock /><span>Sampling Metadata</span></div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              <div className="form-group">
                <label>Date & Time *</label>
                <input type="datetime-local"
                  value={data.sampledAt || ""}
                  onChange={(e) => setData({ ...data, sampledAt: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Sampler</label>
                <input type="text" placeholder="Name / Team"
                  value={data.sampler || ""} onChange={(e)=>setData({...data, sampler: e.target.value})}/>
              </div>
              <div className="form-group">
                <label>Method</label>
                <input type="text" placeholder="Field/Lab method"
                  value={data.method || ""} onChange={(e)=>setData({...data, method: e.target.value})}/>
              </div>
              <div className="form-group">
                <label>Depth (m)</label>
                <input type="number" step="0.01"
                  value={data.depth_m ?? ""} onChange={(e)=>setData({...data, depth_m: e.target.value})}/>
              </div>
              <div className="form-group" style={{ flexBasis: "100%" }}>
                <label>Notes</label>
                <input type="text" placeholder="Weather, conditions, remarks"
                  value={data.notes || ""} onChange={(e)=>setData({...data, notes: e.target.value})}/>
              </div>
            </div>
          </div>
        </div>
      ),
      // no canNext
    },

    {
      key: "measurements",
      title: "Measurements",
      render: ({ data, setData }) => <MeasurementsStep data={data} setData={setData} params={paramOptions} />,
      // no canNext
    },

    {
      key: "attachments",
      title: "Attachments",
      render: ({ data, setData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title"><FiPaperclip /><span>Attachments</span></div>
          </div>
          <div className="dashboard-card-body">
            <div className="dropzone"
              onDragOver={(e)=>e.preventDefault()}
              onDrop={(e)=>{ e.preventDefault(); const files=[...e.dataTransfer.files]; setData({...data, attachments:[...(data.attachments||[]), ...files]}); }}>
              <p>Drop files here or click to select</p>
              <small>Upload lab reports, photos, etc.</small>
              <input type="file" multiple onChange={(e)=>setData({...data, attachments:[...(data.attachments||[]), ...e.target.files]})}/>
            </div>

            <ul style={{ marginTop: 10 }}>
              {(data.attachments||[]).length===0 ? <div className="no-data">No attachments</div> :
                [...data.attachments].map((f,i)=>(
                  <li key={i} className="file-row">
                    <FiPaperclip/><span className="file-name">{f.name || `Attachment ${i+1}`}</span>
                    <button className="action-btn delete" onClick={()=>{
                      const copy=[...data.attachments]; copy.splice(i,1); setData({...data, attachments:copy});
                    }}><FiTrash2/><span className="btn-text">Remove</span></button>
                  </li>
                ))
              }
            </ul>
          </div>
        </div>
      ),
      // no canNext
    },

    {
      key: "review",
      title: "Review & Submit",
      render: ({ data }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title"><FiCheckCircle /><span>Review & Submit</span></div>
          </div>
          <div className="dashboard-card-body">
            <p>Everything looks good? Submitting will create a sample in <strong>draft</strong> or <strong>submitted</strong> status (your choice below).</p>
            {/* You can show a simple summary here; keep it light for MVP */}
            <div className="org-form" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label>Submit as</label>
                <select value={data.submitStatus || "submitted"} onChange={(e)=>{ /* set in onFinish to avoid partial state */ }}>
                  <option value="submitted">Submitted</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ),
      // no canNext
    },
  ];

  return (
    <Wizard
      steps={steps}
      initialData={{
        lakeId: "", stationId: "", sampledAt: "",
        sampler: "", method: "", depth_m: "", notes: "",
        measurements: [], attachments: [],
        submitStatus: "submitted",
      }}
      labels={{ back: "Back", next: "Next", finish: "Submit" }}
      onFinish={(data) => {
        // TODO: POST /api/samples with nested measurements & attachments
        // {
        //   lake_id, station_id, sampled_at, sampler, method, depth_m, notes, status,
        //   measurements: [{ parameter_id, value_num, unit, qualifier, detection_limit, remarks }],
        // }
        console.log("SUBMIT SAMPLE (scaffold):", data);
        alert("Sample submitted (scaffold). Wire to backend when ready.");
      }}
    />
  );
}

/* ---------------- Measurements step (inline editor table) ---------------- */
function MeasurementsStep({ data, setData, params }) {
  const rows = data.measurements || [];

  const addRow = () => {
    setData({ ...data, measurements: [...rows, { parameterId: "", value: "", unit: "", qualifier: "=", dl: "", remarks: "" }] });
  };
  const upd = (idx, patch) => {
    const copy = rows.map((r,i)=> i===idx ? ({ ...r, ...patch }) : r);
    setData({ ...data, measurements: copy });
  };
  const del = (idx) => {
    const copy = rows.slice(); copy.splice(idx,1);
    setData({ ...data, measurements: copy });
  };

  const columns = useMemo(()=>[
    { header: "Parameter", render: (row, idx) => (
        <select value={row.parameterId} onChange={(e)=>{
          const p = params.find(x => String(x.id)===e.target.value);
          upd(idx, { parameterId: e.target.value, unit: p?.unit || row.unit });
        }}>
          <option value="">Select…</option>
          {params.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
      )
    },
    { header: "Value", width: 140,
      render: (row, idx) => (
        <input type="number" step="0.0001" value={row.value}
          onChange={(e)=>upd(idx, { value: e.target.value })} />
      )
    },
    { header: "Unit", width: 120,
      render: (row, idx) => (
        <input type="text" value={row.unit || ""} onChange={(e)=>upd(idx, { unit: e.target.value })}/>
      )
    },
    { header: "Qual.", width: 90,
      render: (row, idx) => (
        <select value={row.qualifier||"="} onChange={(e)=>upd(idx,{ qualifier: e.target.value })}>
          <option>=</option><option>&lt;</option><option>&gt;</option>
        </select>
      )
    },
    { header: "DL", width: 110,
      render: (row, idx) => (
        <input type="number" step="0.0001" value={row.dl || ""} onChange={(e)=>upd(idx,{ dl: e.target.value })}/>
      )
    },
    { header: "Remarks",
      render: (row, idx) => (
        <input type="text" value={row.remarks || ""} onChange={(e)=>upd(idx,{ remarks: e.target.value })}/>
      )
    },
  ], [params]);

  const actions = useMemo(()=>[
    { label: "Remove", type: "delete", icon: <FiTrash2/>, onClick: (_, idx)=> del(idx) },
  ], []);

  const dataWithIndex = rows.map((r,i)=> ({ ...r, __idx: i }));

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-title"><FiList /><span>Measurements</span></div>
        <div className="page-header-actions" style={{ marginLeft: "auto" }}>
          <button type="button" className="pill-btn primary" onClick={addRow}><FiPlus/><span className="hide-sm">Add Row</span></button>
        </div>
      </div>

      <div className="dashboard-card-body">
        <div className="table-wrapper">
          <TableLayout
            columns={columns}
            data={dataWithIndex}
            pageSize={50}
            actions={actions.map(a => ({
              ...a,
              onClick: (row) => a.onClick(row, row.__idx),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
```

## resources/js/pages/OrgInterface/orgMembers.jsx

```jsx
// resources/js/pages/OrgInterface/OrgMembers.jsx
import React, { useMemo, useState } from "react";
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiUserPlus,
  FiRefreshCcw,
  FiEdit2,
  FiTrash2,
  FiMail,
  FiShield,
} from "react-icons/fi";

import TableLayout from "../../layouts/TableLayout";

export default function OrgMembers() {
  // -------------------- State (scaffold) --------------------
  const [members, setMembers] = useState([]); // TODO: GET /api/org/members
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");       // "", "member", "manager", "admin"
  const [status, setStatus] = useState("");   // "", "active", "invited", "suspended"

  // -------------------- Derived / Filters --------------------
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return members.filter((m) => {
      const matchesText =
        !term ||
        [m.name, m.email, m.affiliation]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      const matchesRole = !role || String(m.role || "").toLowerCase() === role;
      const matchesStatus =
        !status || String(m.status || "").toLowerCase() === status;
      return matchesText && matchesRole && matchesStatus;
    });
  }, [members, q, role, status]);

  // -------------------- Columns --------------------
  const columns = useMemo(
    () => [
      { header: "Name", accessor: "name" },
      { header: "Email", accessor: "email", width: 260 },
      { header: "Status", accessor: "status", width: 120 },
      { header: "Joined", accessor: "joined_at", width: 150 },
    ],
    []
  );

  // -------------------- Actions (row) --------------------
  const rowActions = useMemo(
    () => [
      {
        label: "Edit",
        type: "edit",
        icon: <FiEdit2 />,
        onClick: (row) => {
          // TODO: open edit member modal
          console.log("Edit member (scaffold):", row);
        },
      },
      {
        label: "Resend Invite",
        icon: <FiMail />,
        onClick: (row) => {
          // TODO: POST /api/org/members/:id/resend
          console.log("Resend invite (scaffold):", row);
        },
      },
      {
        label: "Change Role",
        icon: <FiShield />,
        onClick: (row) => {
          // TODO: open role change modal
          console.log("Change role (scaffold):", row);
        },
      },
      {
        label: "Remove",
        type: "delete",
        icon: <FiTrash2 />,
        onClick: (row) => {
          // TODO: DELETE /api/org/members/:id
          console.log("Remove member (scaffold):", row);
        },
      },
    ],
    []
  );

  // -------------------- Toolbar handlers --------------------
  const onInvite = () => {
    // TODO: open invite dialog (name, email, role)
    console.log("Invite member (scaffold)");
  };
  const onRefresh = () => {
    // TODO: re-fetch /api/org/members
    console.log("Refresh members (scaffold)");
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          <FiUsers />
          <span>Members</span>
        </div>

        {/* Toolbar */}
        <div className="dashboard-toolbar" style={{ marginLeft: "auto", gap: 10 }}>
          {/* Search */}
          <div className="org-search" style={{ minWidth: 220 }}>
            <FiSearch className="toolbar-icon" />
            <input
              type="text"
              placeholder="Search members…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div className="org-filter">
            <FiFilter className="toolbar-icon" />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Right actions */}
          <div className="org-actions-right">
            <button type="button" className="pill-btn" onClick={onRefresh} title="Refresh">
              <FiRefreshCcw />
              <span className="hide-sm">Refresh</span>
            </button>
            <button
              type="button"
              className="pill-btn primary"
              onClick={onInvite}
              title="Invite Member"
            >
              <FiUserPlus />
              <span className="hide-sm">Invite</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="dashboard-card-body">
        <div className="table-wrapper">
          <TableLayout
            columns={columns}
            data={filtered}
            pageSize={10}
            actions={rowActions}
          />
        </div>
      </div>
    </div>
  );
}
```

## resources/js/pages/OrgInterface/orgOverview.jsx

```jsx
// resources/js/pages/OrgInterface/OrgOverview.jsx
import React, { useMemo } from "react";
import {
  FiUsers,          // Active Members
  FiDatabase,       // Tests Logged
  FiClipboard,      // Pending Approvals
  FiFlag,           // Alerts/Flagged
  FiActivity,       // Recent Activity header icon
  FiPlus,           // Log Test
  FiUserPlus,       // Invite Member
  FiList,           // View Test Results
  FiUploadCloud,    // Uploads
} from "react-icons/fi";

import { Link } from "react-router-dom";
import AppMap from "../../components/AppMap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* --- Leaflet default marker fix (keeps OSM markers visible) --- */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ============================================================
   KPI Grid (4 stats; empty values for now)
   ============================================================ */
function KPIGrid() {
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-icon"><FiUsers /></div>
        <div className="kpi-info">
          <span className="kpi-title">Active Members</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiDatabase /></div>
        <div className="kpi-info">
          <span className="kpi-title">Tests Logged</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiClipboard /></div>
        <div className="kpi-info">
          <span className="kpi-title">Pending Approvals</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiFlag /></div>
        <div className="kpi-info">
          <span className="kpi-title">Alerts / Flagged</span>
          <span className="kpi-value"></span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Quick Actions (shortcuts)
   ============================================================ */
function QuickActions() {
  return (
    <div className="dashboard-card" style={{ marginBottom: 16 }}>
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          {/* No icon here to keep it minimal */}
          <span>Quick Actions</span>
        </div>
      </div>
      <div className="dashboard-card-body">
        <div className="dashboard-toolbar" style={{ gap: 10 }}>
          <Link to="/org-dashboard/test-results" className="pill-btn primary" title="Log Test">
            <FiPlus /><span className="hide-sm">Log Test</span>
          </Link>
          <Link to="/org-dashboard/test-results" className="pill-btn" title="View Test Results">
            <FiList /><span className="hide-sm">View Tests</span>
          </Link>
          <Link to="/org-dashboard/members" className="pill-btn" title="Invite Member">
            <FiUserPlus /><span className="hide-sm">View Members</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Tests Map
   - Shows only logged test locations (none yet)
   ============================================================ */
function TestsMap() {
  return (
    <div className="map-container" style={{ marginBottom: 16 }}>
      <AppMap view="osm" style={{ height: "100%", width: "100%" }}>
        {/*
          TODO: Once data exists, place markers for this org's logged tests here.
          e.g. tests.map(t => <Marker position={[t.lat,t.lng]} />)
        */}
      </AppMap>
    </div>
  );
}

/* ============================================================
   Recent Activity (Water Quality Logs only)
   - Empty list for now
   ============================================================ */
function RecentLogs() {
  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          <FiActivity /><span>Recent Activity (Water Quality Logs)</span>
        </div>
      </div>
      <div className="dashboard-card-body">
        <ul className="recent-logs-list">
          {/* Intentionally empty. Map over this org's recent WQ logs here. */}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   Page: OrgOverview
   - Mirrors AdminOverview’s structure (KPIs → Map → Logs)
   - Adds a Quick Actions card at top
   ============================================================ */
export default function OrgOverview() {
  return (
    <>
      <QuickActions />
      <KPIGrid />
      <TestsMap />
      <RecentLogs />
    </>
  );
}
```

## resources/js/pages/PublicInterface/AboutData.jsx

```jsx
import React from "react";

function AboutData() {
  return (
    <div className="content-page">
      <h1>About the Data</h1>
      <p>
        This is a placeholder for the data information page. Here you can explain the data
        sources, accuracy, and methodologies used in LakeView PH.
      </p>
    </div>
  );
}

export default AboutData;
```

## resources/js/pages/PublicInterface/AboutPage.jsx

```jsx
import React from "react";

function AboutPage() {
  return (
    <div className="content-page">
      <h1>About LakeView PH</h1>
      <p>
        This is a placeholder for the About LakeView PH page. Here you can provide background
        information about the project, its purpose, and its goals.
      </p>
    </div>
  );
}

export default AboutPage;
```

## resources/js/pages/PublicInterface/LoginPage.jsx

```jsx
// resources/js/pages/PublicInterface/LoginPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Login failed");
      }

      const { token, user } = await res.json();
      localStorage.setItem("lv_token", token);

      const role = user?.role || "public";
      if (role === "superadmin") navigate("/admin-dashboard", { replace: true });
      else if (role === "org_admin") navigate("/org-dashboard", { replace: true });
      else if (role === "contributor") navigate("/contrib-dashboard", { replace: true });
      else navigate("/", { replace: true });
    } catch (e) {
      setErr("Invalid email or password.");
    } finally {
      // Clear sensitive input from memory/DOM
      setPassword("");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Single Column Form */}
        <div className="auth-form">
          <div className="auth-brand">
            <img src="/lakeview-logo-alt.png" alt="LakeView PH" />
            <span>LakeView PH</span>
          </div>
          
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Log in to continue to LakeView PH</p>

          {err ? <div className="auth-error">{err}</div> : null}

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <div className="auth-forgot">Forgot your password?</div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Logging in..." : "LOG IN"}
            </button>
          </form>

          <p className="auth-switch">
            Don’t have an account?{" "}
            <Link to="/register" className="auth-link">
              Sign Up
            </Link>
          </p>
          <div className="auth-back-row">
            <Link to="/" className="auth-back" title="Back to LakeView">
              <FiArrowLeft size={16} />
              <span>Back to LakeView</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## resources/js/pages/PublicInterface/MapPage.jsx

```jsx
// src/pages/MapPage.jsx
// ----------------------------------------------------
// Main Map Page Component for LakeView PH
// ----------------------------------------------------
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { api } from "../../lib/api";
import { useMap, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import AppMap from "../../components/AppMap";
import MapControls from "../../components/MapControls";
import SearchBar from "../../components/SearchBar";
import LayerControl from "../../components/LayerControl";
import ScreenshotButton from "../../components/ScreenshotButton";
import Sidebar from "../../components/Sidebar";
import ContextMenu from "../../components/ContextMenu";
import MeasureTool from "../../components/MeasureTool";
import LakeInfoPanel from "../../components/LakeInfoPanel";
import AuthModal from "../../components/AuthModal";

// Utility: Context Menu Wrapper
function MapWithContextMenu({ children }) {
  const map = useMap();
  return children(map);
}

function MapPage() {
  // ---------------- State ----------------
  const [selectedView, setSelectedView] = useState("satellite");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);

  const [selectedLake, setSelectedLake] = useState(null);
  const [lakePanelOpen, setLakePanelOpen] = useState(false);

  const [measureActive, setMeasureActive] = useState(false);
  const [measureMode, setMeasureMode] = useState("distance");

  const [userRole, setUserRole] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  // Public FeatureCollection of lakes (active Public layer only)
  const [publicFC, setPublicFC] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);

  // ---------------- Auth / route modal ----------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api("/auth/me");
        if (!mounted) return;
        setUserRole(['superadmin','org_admin','contributor'].includes(me.role) ? me.role : null);
      } catch { if (mounted) setUserRole(null); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const p = location.pathname;
    if (p === "/login")  { setAuthMode("login"); setAuthOpen(true); }
    if (p === "/register") { setAuthMode("register"); setAuthOpen(true); }
  }, [location.pathname]);

  // ---------------- Fetch public lake geometries ----------------
  const loadPublicLakes = async () => {
    try {
      const fc = await api("/public/lakes-geo"); // FeatureCollection
      if (fc?.type === "FeatureCollection") {
        setPublicFC(fc);

        // Fit to all lakes
        if (mapRef.current && fc.features?.length) {
          const gj = L.geoJSON(fc);
          const b = gj.getBounds();
          if (b?.isValid?.() === true) {
            mapRef.current.fitBounds(b, { padding: [24, 24], maxZoom: 9, animate: false });
          }
        }
      } else {
        setPublicFC({ type: "FeatureCollection", features: [] });
      }
    } catch (e) {
      console.error("[MapPage] Failed to load public lakes", e);
      setPublicFC({ type: "FeatureCollection", features: [] });
    }
  };

  useEffect(() => { loadPublicLakes(); }, []);

  // ---------------- Hotkeys (L / Esc) ----------------
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (["input","textarea","select"].includes(tag)) return;
      const k = e.key?.toLowerCase?.();
      if (k === "l") setLakePanelOpen(v => !v);
      if (k === "escape") setLakePanelOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // ---------------- Heatmap stub ----------------
  const togglePopulationHeatmap = (on, distanceKm) => {
    console.log("[Heatmap]", on ? "ON" : "OFF", "distance:", distanceKm, "km");
  };

  // ---------------- Render ----------------
  const themeClass = selectedView === "satellite" ? "map-dark" : "map-light";
  const worldBounds = [[4.6,116.4],[21.1,126.6]];

  return (
    <div className={themeClass} style={{ height: "100vh", width: "100vw", margin: 0, padding: 0 }}>
      <AppMap
        view={selectedView}
        zoomControl={false}
        whenCreated={(m) => (mapRef.current = m)}
      >
        {/* Render all public default lake geometries */}
        {publicFC && (
          <GeoJSON
            key={JSON.stringify(publicFC).length}
            data={publicFC}
            style={{ weight: 2, fillOpacity: 0.12 }}
            onEachFeature={(feat, layer) => {
            layer.on("click", () => {
              const p = feat?.properties || {};
              setSelectedLake({
                name: p.name,
                alt_name: p.alt_name,
                region: p.region,
                province: p.province,
                municipality: p.municipality,
                watershed_name: p.watershed_name,
                surface_area_km2: p.surface_area_km2,
                elevation_m: p.elevation_m,
                mean_depth_m: p.mean_depth_m,
              });
              setLakePanelOpen(true);
              if (mapRef.current) {
                const b = layer.getBounds();
                if (b?.isValid?.() === true) {
                  mapRef.current.fitBounds(b, { padding: [24, 24], maxZoom: 12 });
                }
              }
            });
            layer.on("mouseover", () => layer.setStyle({ weight: 3 }));
            layer.on("mouseout",  () => layer.setStyle({ weight: 2 }));
          }}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pinned={sidebarPinned}
          setPinned={setSidebarPinned}
          onOpenAuth={(m) => { setAuthMode(m || "login"); setAuthOpen(true); }}
        />

        {/* Context Menu */}
        <MapWithContextMenu>
          {(map) => {
            map.on("click", () => { if (!sidebarPinned) setSidebarOpen(false); });
            map.on("dragstart", () => { if (!sidebarPinned) setSidebarOpen(false); });
            return (
              <ContextMenu
                map={map}
                onMeasureDistance={() => { setMeasureMode("distance"); setMeasureActive(true); }}
                onMeasureArea={() => { setMeasureMode("area"); setMeasureActive(true); }}
              />
            );
          }}
        </MapWithContextMenu>

        {/* Measure Tool */}
        <MeasureTool active={measureActive} mode={measureMode} onFinish={() => setMeasureActive(false)} />

        {/* Map Controls */}
        <MapControls defaultBounds={worldBounds} />
      </AppMap>

      {/* Lake Info Panel */}
      <LakeInfoPanel
        isOpen={lakePanelOpen}
        onClose={() => setLakePanelOpen(false)}
        lake={selectedLake}
        onToggleHeatmap={(on, km) => togglePopulationHeatmap(on, km)}
      />

      {/* UI overlays */}
      <SearchBar onMenuClick={() => setSidebarOpen(true)} />
      <LayerControl selectedView={selectedView} setSelectedView={setSelectedView} />
      <ScreenshotButton />

      {/* Back to Dashboard */}
      {userRole && (
        <button
          className="map-back-btn"
          onClick={() => {
            if (userRole === "superadmin") navigate("/admin-dashboard");
            else if (userRole === "org_admin") navigate("/org-dashboard");
            else if (userRole === "contributor") navigate("/contrib-dashboard");
          }}
          title="Back to Dashboard"
          style={{ position: "absolute", bottom: 20, right: 20, zIndex: 1100, display: "inline-flex" }}
        >
          <FiArrowLeft />
        </button>
      )}

      {/* Auth Modal */}
      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => {
          setAuthOpen(false);
          if (location.pathname === "/login" || location.pathname === "/register") {
            navigate("/", { replace: true });
          }
        }}
      />
    </div>
  );
}

export default MapPage;
```

## resources/js/pages/PublicInterface/RegistrationPage.jsx

```jsx
// resources/js/pages/PublicInterface/RegistrationPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Registration failed");
      }

      // API returns token + user (role will be "public" by default)
      const { token } = await res.json();
      localStorage.setItem("lv_token", token);

      // Send new users to public interface (or a welcome page)
      navigate("/", { replace: true });
    } catch (e) {
      setErr("Registration failed. Email may already be registered.");
    } finally {
      // Clear sensitive input from memory/DOM
      setPassword("");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Single Column Form */}
        <div className="auth-form">
          <div className="auth-brand">
            <img src="/lakeview-logo-alt.png" alt="LakeView PH" />
            <span>LakeView PH</span>
          </div>
          <h2>Create a New Account</h2>
          <p className="auth-subtitle">Sign up to access LakeView PH</p>

          {err ? <div className="auth-error">{err}</div> : null}

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Full Name"
              value={full_name}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <div className="auth-hint">Use at least 8 characters for a strong password.</div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Creating account..." : "REGISTER"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Log In
            </Link>
          </p>
          <div className="auth-back-row">
            <Link to="/" className="auth-back" title="Back to LakeView">
              <FiArrowLeft size={16} />
              <span>Back to LakeView</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## resources/js/pages/PublicInterface/Settings.jsx

```jsx
import React from "react";

function Settings() {
  return (
    <div className="content-page">
      <h1>Settings</h1>
      <p>
        This is a placeholder for the settings page. Users will eventually be able to
        customize preferences for using LakeView PH here.
      </p>
    </div>
  );
}

export default Settings;
```

## resources/js/pages/PublicInterface/SubmitFeedback.jsx

```jsx
import React from "react";

function SubmitFeedback() {
  return (
    <div className="content-page">
      <h1>Submit Feedback</h1>
      <p>
        This is a placeholder for the feedback page. Users will be able to submit comments,
        issues, or suggestions to improve LakeView PH.
      </p>
    </div>
  );
}

export default SubmitFeedback;
```

## resources/js/pages/PublicInterface/UserManual.jsx

```jsx
import React from "react";

function UserManual() {
  return (
    <div className="content-page">
      <h1>How to Use LakeView PH</h1>
      <p>
        This is a placeholder for the user manual. Here you can explain how to use the features
        of the map, sidebar, and tools within LakeView PH.
      </p>
    </div>
  );
}

export default UserManual;
```

## resources/js/utils/alerts.js

```js
// resources/js/utils/alerts.js
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export const alertSuccess = (title, text) =>
  MySwal.fire({ icon: "success", title, text, timer: 1800, showConfirmButton: false });

export const alertError = (title, text) =>
  MySwal.fire({ icon: "error", title, text });

export const alertInfo = (title, text) =>
  MySwal.fire({ icon: "info", title, text });

export const confirm = async (title, text, confirmButtonText = "Yes") => {
  const res = await MySwal.fire({
    icon: "question",
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    reverseButtons: true,
    focusCancel: true,
  });
  return res.isConfirmed;
};
```

## resources/js/utils/auth.js

```js
// resources/js/utils/auth.js
import { clearToken } from "../lib/api";
import { alertSuccess } from "./alerts";

export function logout() {
  clearToken();
  alertSuccess("Signed out", "You have been signed out.");
  // Optionally hard-redirect to login
  // location.href = "/login";
}
```

## resources/js/utils/geo.js

```js
// resources/js/utils/geo.js
import proj4 from "proj4";
import L from "leaflet";

/**
 * Tolerant flattener: GeoJSON (Polygon/MultiPolygon/Feature/FeatureCollection)
 * → MultiPolygon (polygon-only). Ignores non-polygon features.
 * Throws if no polygonal geometries are found.
 */
export const toMultiPolygon = (geojson) => {
  if (!geojson || typeof geojson !== "object") throw new Error("Invalid GeoJSON");
  const t = (geojson.type || "").toLowerCase();

  const asMP = (g) => {
    if (!g) throw new Error("Feature has no geometry");
    const gt = (g.type || "").toLowerCase();
    if (gt === "polygon") return { type: "MultiPolygon", coordinates: [g.coordinates] };
    if (gt === "multipolygon") return { type: "MultiPolygon", coordinates: g.coordinates };
    return null; // ignore non-polygons
  };

  if (t === "polygon" || t === "multipolygon") return asMP(geojson);

  if (t === "feature") {
    const mp = asMP(geojson.geometry);
    if (!mp) throw new Error("Only Polygon/MultiPolygon geometries are supported.");
    return mp;
  }

  if (t === "featurecollection") {
    const polys = [];
    for (const f of geojson.features || []) {
      const mp = asMP(f?.geometry);
      if (mp) polys.push(...mp.coordinates);
    }
    if (!polys.length) throw new Error("No polygonal geometries found in the file.");
    return { type: "MultiPolygon", coordinates: polys };
  }

  throw new Error("Unsupported GeoJSON type. Provide Polygon/MultiPolygon/Feature/FeatureCollection.");
};

/** Detect EPSG from common GeoJSON crs encodings (name/URN/link/old code). */
export const detectEpsg = (root) => {
  if (!root || typeof root !== "object") return null;
  const crs = root.crs || {};
  const props = crs.properties || {};
  const name = (props.name || crs.name || "").toString();
  const href = (props.href || "").toString();

  // CRS84 → treat as 4326
  if (/CRS84/i.test(name) || /CRS84/i.test(href)) return 4326;

  // "EPSG:4326", "urn:ogc:def:crs:EPSG::32651"
  let m = name.match(/EPSG(?:::|:)\s*(\d{3,5})/i);
  if (m) return parseInt(m[1], 10);

  // Links like "https://epsg.io/32651"
  m = href.match(/epsg\.io\/(\d{3,5})/i);
  if (m) return parseInt(m[1], 10);

  // Old style: { "type": "EPSG", "properties": { "code": 32651 } }
  if (crs.type && /epsg/i.test(crs.type) && typeof props.code === "number") {
    return props.code;
  }
  return null;
};

/** Heuristic: coordinates look like lon/lat degrees? */
export const looksLikeDegrees = (mp) => {
  try {
    let n = 0, ok = 0;
    for (const poly of mp.coordinates || []) {
      for (const ring of poly || []) {
        for (const pt of ring || []) {
          if (!Array.isArray(pt) || pt.length < 2) continue;
          const [x, y] = pt;
          if (typeof x !== "number" || typeof y !== "number") continue;
          n++;
          if (x >= -180 && x <= 180 && y >= -90 && y <= 90) ok++;
          if (n >= 80) break;
        }
        if (n >= 80) break;
      }
      if (n >= 80) break;
    }
    return n > 0 && ok / n > 0.9;
  } catch {
    return false;
  }
};

/**
 * If data is already degree-like but XY are flipped (lat,lon),
 * fix to (lon,lat) for preview.
 */
export const maybeSwapXY = (mp) => {
  try {
    let n = 0, latLonish = 0;
    for (const poly of mp.coordinates || []) {
      for (const ring of poly || []) {
        for (const [x, y] of ring || []) {
          if (typeof x !== "number" || typeof y !== "number") continue;
          n++;
          if (Math.abs(y) > 90 && Math.abs(x) <= 90) latLonish++; // looks like [lat, lon]
          if (n >= 80) break;
        }
        if (n >= 80) break;
      }
      if (n >= 80) break;
    }
    if (n && latLonish / n > 0.6) {
      return {
        type: "MultiPolygon",
        coordinates: mp.coordinates.map(poly =>
          poly.map(ring => ring.map(([x, y, ...rest]) => [y, x, ...rest]))
        ),
      };
    }
  } catch {}
  return mp;
};

/** Minimal proj defs for common cases (extend if you need more). */
export const projDefFor = (epsg) => {
  if (epsg === 4326) return null; // WGS84 degrees
  if (epsg === 3857)
    return "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +units=m +no_defs +type=crs";
  // UTM WGS84 (north)
  if (epsg >= 32601 && epsg <= 32660) {
    const zone = epsg - 32600;
    return `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs +type=crs`;
  }
  // UTM WGS84 (south)
  if (epsg >= 32701 && epsg <= 32760) {
    const zone = epsg - 32700;
    return `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs +type=crs`;
  }
  return null; // unknown: preview will stay as-is (likely off-map if not degrees)
};

/** Reproject MultiPolygon from EPSG:* → 4326 for Leaflet preview. */
export const reprojectMultiPolygonTo4326 = (mp, fromEPSG) => {
  const def = projDefFor(fromEPSG);
  if (!def || !mp?.coordinates) return mp;
  const to = proj4.WGS84;
  return {
    type: "MultiPolygon",
    coordinates: mp.coordinates.map(poly =>
      poly.map(ring =>
        ring.map(([x, y, ...rest]) => {
          const [lon, lat] = proj4(def, to, [x, y]);
          return [lon, lat, ...rest];
        })
      )
    ),
  };
};

/** Guess SRID if none: prefer 4326 if deg-like; else default UTM zone 51N (PH). */
export const autoGuessEpsg = (mp) => (looksLikeDegrees(mp) ? 4326 : 32651);

/**
 * Given a parsed GeoJSON object:
 *  - returns original polygon(s) as MultiPolygon (`uploadGeom`)
 *  - returns a preview geometry in EPSG:4326 (`previewGeom`)
 *  - returns detected/assumed source SRID (`sourceSrid`)
 */
export const normalizeForPreview = (parsed) => {
  const uploadGeom = toMultiPolygon(parsed);
  let sourceSrid = detectEpsg(parsed);
  if (!sourceSrid) sourceSrid = autoGuessEpsg(uploadGeom);

  let previewGeom =
    sourceSrid !== 4326 ? reprojectMultiPolygonTo4326(uploadGeom, sourceSrid) : maybeSwapXY(uploadGeom);

  return { uploadGeom, previewGeom, sourceSrid };
};

/** Leaflet bounds helper for (Multi)Polygon geometry objects. */
export const boundsFromGeom = (geom) => {
  try {
    return L.geoJSON({ type: "Feature", geometry: geom }).getBounds();
  } catch {
    return null;
  }
};
```

## resources/js/app.jsx

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// 🌍 Public Pages
import AboutData from  "./pages/PublicInterface/AboutData";
import AboutPage from "./pages/PublicInterface/AboutPage";
import MapPage from "./pages/PublicInterface/MapPage";
import Settings from "./pages/PublicInterface/Settings.jsx";
import SubmitFeedback from "./pages/PublicInterface/SubmitFeedback.jsx";
import UserManual from "./pages/PublicInterface/UserManual";

// 📊 Dashboards (Role-based)
import AdminDashboard from "./pages/AdminInterface/AdminDashboard";
import OrgDashboard from "./pages/OrgInterface/OrgDashboard";
import ContributorDashboard from "./pages/ContributorInterface/ContributorDashboard.jsx";
// import UserDashboard from "./pages/user/UserDashboard"; // add later if needed

// 🎨 Global Styles
import "../css/app.css";

//Component
import RequireRole from "../js/components/RequireRole.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* 🌍 Public routes */}
        <Route path="/" element={<MapPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/manual" element={<UserManual />} />
        <Route path="/feedback" element={<SubmitFeedback />} />
        <Route path="/data" element={<AboutData />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<MapPage />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<MapPage />} />

        {/* 📊 Dashboards */}
        <Route path="/admin-dashboard/*" element={
          <RequireRole allowed={['superadmin']}><AdminDashboard /></RequireRole>
        } />
        <Route path="/org-dashboard/*" element={
          <RequireRole allowed={['org_admin']}><OrgDashboard /></RequireRole>
        } />
        <Route path="/contrib-dashboard/*" element={
          <RequireRole allowed={['contributor']}><ContributorDashboard /></RequireRole>
        } />
      </Routes>
    </Router>
  );
}

// ✅ Mount App to the root div
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## resources/views/mail/plain.blade.php

```php
{{ $content }}
```

## resources/views/app.blade.php

```php
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LakeView PH</title>
    @viteReactRefresh
    @vite('resources/js/app.jsx')

    <link rel="icon" type="image/png" href="{{ asset('lakeview-logo-alt.png') }}">

</head>
<body>
    <div id="root"></div>
</body>
</html>
```

## routes/api.php

```php
<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\LakeController;
use App\Http\Controllers\WatershedController;
use App\Http\Controllers\Api\LayerController as ApiLayerController;
use App\Http\Controllers\Api\OptionsController;
use App\Http\Controllers\EmailOtpController;
use App\Http\Controllers\Api\TenantController;

Route::prefix('auth')->group(function () {

    // Registration OTP
    Route::post('/register/request-otp', [EmailOtpController::class, 'registerRequestOtp'])->middleware('throttle:6,1');
    Route::post('/register/verify-otp',  [EmailOtpController::class, 'registerVerifyOtp'])->middleware('throttle:12,1');

    // Forgot Password OTP
    Route::post('/forgot/request-otp',   [EmailOtpController::class, 'forgotRequestOtp'])->middleware('throttle:6,1');
    Route::post('/forgot/verify-otp',    [EmailOtpController::class, 'forgotVerifyOtp'])->middleware('throttle:12,1');
    Route::post('/forgot/reset',         [EmailOtpController::class, 'forgotReset'])->middleware('throttle:6,1');

    // Resend
    Route::post('/otp/resend',           [EmailOtpController::class, 'resend'])->middleware('throttle:6,1');

    Route::post('/register', [AuthController::class, 'register']); // public
    Route::post('/login',    [AuthController::class, 'login']);    // public

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me',      [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Example protected API groups (wire later as you build)
Route::middleware(['auth:sanctum','role:superadmin'])->prefix('admin')->group(function () {
    Route::get('/whoami', fn() => ['ok' => true]);

    Route::get('/tenants', [TenantController::class, 'index']);
    Route::post('/tenants', [TenantController::class, 'store']);
    Route::get('/tenants/{tenant}', [TenantController::class, 'show']);
    Route::put('/tenants/{tenant}', [TenantController::class, 'update']);
    Route::delete('/tenants/{tenant}', [TenantController::class, 'destroy']);
    Route::post('/tenants/{id}/restore', [TenantController::class, 'restore']);
});

Route::middleware(['auth:sanctum','role:org_admin'])->prefix('org')->group(function () {
    Route::get('/whoami', fn() => ['ok' => true]);
});

Route::middleware(['auth:sanctum','role:contributor'])->prefix('contrib')->group(function () {
    Route::get('/whoami', fn() => ['ok' => true]);
});

// Lakes
Route::get('/lakes',            [LakeController::class, 'index']);
Route::get('/lakes/{lake}',     [LakeController::class, 'show']);
Route::post('/lakes',           [LakeController::class, 'store']);
Route::put('/lakes/{lake}',     [LakeController::class, 'update']);   // or PATCH
Route::delete('/lakes/{lake}',  [LakeController::class, 'destroy']);
Route::get('/public/lakes-geo', [LakeController::class, 'publicGeo']); // public FeatureCollection

// Watersheds
Route::get('/watersheds', [WatershedController::class, 'index']); // for dropdowns

// Layers (single canonical controller)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/layers',           [ApiLayerController::class, 'index']);   // ?body_type=lake&body_id=1&include=bounds
    Route::get('/layers/active',    [ApiLayerController::class, 'active']);  // active for a body
    Route::post('/layers',          [ApiLayerController::class, 'store']);   // superadmin only (enforced in controller)
    Route::patch('/layers/{id}',    [ApiLayerController::class, 'update']);  // superadmin only (enforced in controller)
    Route::delete('/layers/{id}',   [ApiLayerController::class, 'destroy']); // superadmin only (enforced in controller)
});

// Slim options for dropdowns (id + name), with optional ?q=
Route::get('/options/lakes',      [OptionsController::class, 'lakes']);
Route::get('/options/watersheds', [OptionsController::class, 'watersheds']);
```

## routes/console.php

```php
<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
```

## routes/web.php

```php
<?php

use Illuminate\Support\Facades\Route;

// Named login route for guest redirects (Laravel default)
// Points to your SPA shell so the frontend router can handle /login
Route::view('/login', 'app')->name('login');

Route::get('/{any}', function () {
    return view('app'); // your main blade file that mounts React
})->where('any', '.*');
```

## .env

```
APP_NAME=Laravel
APP_ENV=local
APP_KEY=base64:Mz9dKMOcfqhQ+UNRY9fXWNJ77OYaQSQdQGa9HLgeaXY=
APP_DEBUG=true
APP_URL=http://localhost

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

APP_MAINTENANCE_DRIVER=file
# APP_MAINTENANCE_STORE=database

PHP_CLI_SERVER_WORKERS=4

BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=lakeview
DB_USERNAME=postgres
DB_PASSWORD=L@keView@2025

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database

CACHE_STORE=database
# CACHE_PREFIX=

MEMCACHED_HOST=127.0.0.1

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=dormshtslvph@gmail.com
MAIL_PASSWORD="abhb cdow hwnv oipg"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=dormshtslvph@gmail.com
MAIL_FROM_NAME="LakeView PH"

OTP_PEPPER=d7f28967e43cb0f4268691d369f27a17efa765e5144f4fe6e5870d361b53bf5b

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

VITE_APP_NAME="${APP_NAME}"
```

