<?xml version="1.0" encoding="UTF-8" ?>
<testsuites name="{{!it.title}}" errors="0" failures="{{=it.stats.failures}}" tests="{{=it.stats.tests}}">{{~it.scenarios :scenario:index}}
    <testsuite errors="0" failures="{{=scenario.stats.failures}}" name="{{!scenario.title}}" skipped="{{=scenario.stats.pending}}" tests="{{=scenario.stats.tests}}" time="{{=scenario.stats.duration / 1000}}" timestamp="{{=scenario.stats.start.toISOString()}}">
        {{~scenario.steps :step:index1}}{{? step.failure }}
        <testcase classname="{{!scenario.title}}" name="{{!step.title}}" time="{{=step.duration / 1000}}">
            <failure type="{{!step.failure.name}}" message="{{!step.failure.message}}">
                <![CDATA[{{=step.failure.stack}}]]>
            </failure>
        </testcase>{{??!step.success}}
        <testcase classname="{{!scenario.title}}" name="{{!step.title}}" time="{{=step.duration / 1000}}">
            <skipped/>
        </testcase>{{??}}
        <testcase classname="{{!scenario.title}}" name="{{!step.title}}" time="{{=step.duration / 1000}}" />{{?}}{{~}}
    </testsuite>{{~}}
</testsuites>