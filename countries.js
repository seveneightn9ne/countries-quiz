Countries = new Meteor.Collection('countries')
Properties = new Meteor.Collection('properties')

if (Meteor.isClient) {

  Session.set("current_page", "listcountries")

  $(document).ready(function(){
    $("input[type=text]").first().focus()
  })

  // Template main
  Template.main.events({
    'click a.links' : function(event) {
      Session.set("current_page", "")
      page = $(event.currentTarget).attr("data-link")
      if (page=="quiz"){
        get_new_question("all")
      } if (page=="research"){
        get_new_research_question()
      }
      Session.set("current_page", page)
    }
  })
  Template.main.current_page = function(page){
    return page == Session.get("current_page")
  }
  Template.main.current_country = function() {
    return {country: Session.get("current_country")}
  }

  // Template listcountries
  Template.listcountries.properties = function() {
    return Properties.find({}, {sort: {property: 1}})
  }
  Template.listcountries.countries = function() {
    return Countries.find({}, {sort: {country: 1}})
  }
  Template.listcountries.fetch = function(country, property) {
    return Countries.findOne({'country': country})[property]
  }
  Template.listcountries.hasProperty = function(country, property) {
    return (property in Countries.findOne({'country': country}))
  }
  Template.listcountries.events({
    'click .editcountry' : function (event) {
      Session.set("current_country", $(event.currentTarget).attr("data-country"))
      Session.set("current_page", "editcountry")
    }
  })

  // Template addcountry
  Template.addcountry.events({
    'submit form#addcountry' : function (event) {
      var country = document.getElementById('country')
      // console.log(country)
      if (country.value != '') {
        existing = Countries.find({country: country.value}).fetch()
        if (existing.length > 0) {
          Session.set("addcountry_error", "Country already exists")
          setTimeout(function() {
            Session.set("addcountry_error", "")
          }, 2000)
        } else {
          Session.set("addcountry_error", "")
          data = {country: country.value}
          $("input.property").each(function(){
            property = $(this).attr("id")
            data[property]=$(this).val()
          })
          Countries.insert(data)
          $("form").trigger("reset")
        }
      }
      event.preventDefault()
    }
  });
  Template.addcountry.properties = function() {
    return Properties.find({}, {sort: {property: 1}})
  }
  Template.addcountry.error = function() {
    return Session.get("addcountry_error")
  }

  // Template addproperty
  Template.addproperty.events({
    'submit #addproperty' : function (event) {
      $name = $("#property")
      if ($name.val() != '') {
        Properties.insert({
          property: $name.val(),
          type: $("#type").val()
        })
        $("form#addproperty").trigger("reset")
        event.preventDefault()
      }
    }
  })

  // Template editcountry
  Template.editcountry.properties = function() {
    return Properties.find({}, {sort: {property: 1}})
  }
  Template.editcountry.fetch = function(country, property) {
    return Countries.findOne({'country': country})[property]
  }
  Template.editcountry.events({
    'submit #editcountry' : function(event) {
      country = Session.get("current_country")
      id = Countries.findOne({country: country})._id
      data = {country: country}
      $("input.property").each(function(){
        property = $(this).attr("id")
        value = $(this).val()
        data[property]=value
      })
      Countries.update({_id: id}, data)
      Session.set("current_country", "")
      Session.set("current_page", "listcountries")
      event.preventDefault()
    }
  })

  // Template research
  function get_new_research_question() {
    cppair = {}
    failed_properties = []
    max = Properties.find().fetch().length
    while (cppair.country==null) {
      if (failed_properties.length == max) {
        return false
      }
      property = Random.choice(Properties.find({}).fetch()).property
      if (_.contains(failed_properties, property)){
        continue
      }
      search = { $or: [{},{}]}
      search.$or[0][property] = {$exists: false}
      search.$or[1][property] = ''
      country_obj = Random.choice(Countries.find(search).fetch())
      if (country_obj != undefined) {
        Session.set("cppair", {country: country_obj.country, property: property})
        return
      } else {
        failed_properties.push(property)
      }
    }
  }
  Template.research.cppair = function() {
    return Session.get("cppair")
  }
  Template.research.is = function() {
    property_obj = Properties.findOne({property: Session.get("cppair").property})
    if (property_obj.type == "text"){
      return "is"
    } else {
      return "are"
    }
  }
  Template.research.events({
    'submit #research' : function(event) {
      country = $("#newdata").attr("data-country")
      property = $("#newdata").attr("data-property")
      console.log(property + " " + country)
      console.log(Countries.findOne({country: country}))
      country_obj = Countries.findOne({country: country})
      country_obj[property] = $("#newdata").val()
      console.log(country_obj)
      Countries.update({_id: country_obj._id}, country_obj)
      console.log(Countries.findOne({_id: country_obj._id}))
      $("#newdata").val("")
      get_new_research_question()
      event.preventDefault()
    },
    'click input#skip' : function(event) {
      get_new_research_question()
    },
    'click .goto-country' : function(event) {
      Session.set("current_page", "addcountry")
    },
    'click .goto-property' : function(event) {
      Session.set("current_page", "addproperty")
    }
  })

  // Template quiz
  function get_new_question(property) {
    failed_properties = []
    if(property=="all"){
      max = Properties.find().fetch().length
    } else {max = 1}
    while (true) {
      if (failed_properties.length == max) {
        return false
      }
      if( property=="all"){
        property = Random.choice(Properties.find({}).fetch()).property
      }
      if (_.contains(failed_properties, property)){
        continue
      }
      search = { $and: [{},{}]}
      search.$and[0][property] = {$exists: true}
      search.$and[1][property] = {$ne: ''}
      country_obj = Random.choice(Countries.find(search).fetch())
      if (country_obj != undefined) {
        Session.set("cppair_quiz", {country: country_obj.country, property: property})
        property_obj = Properties.findOne({property: property})
        if (property_obj.type=="list"){
          len = country_obj[property].split(", ").length
          Session.set("answer", {
            type: "list", 
            display: "0/"+len, 
            cclass: "", 
            correct: [],
            answer: country_obj[property].split(", ")
          })
        } else {
          Session.set("answer", {
            type: "text",
            display: "",
            cclass: "",
            answer: country_obj[property]
          })
        }
        return
      } else {
        failed_properties.push(property)
      }
    }

  }
  Template.quiz.cppair = function() {
    return Session.get("cppair_quiz")
  }
  Template.quiz.is = function() {
    property_obj = Properties.findOne({property: Session.get("cppair_quiz").property})
    if (property_obj.type == "text"){
      return "is"
    } else {
      return "are"
    }
  }
  Template.quiz.answer = function() {
    ans = Session.get("answer")
    console.log(ans)
    if (ans != undefined && ans.display) {
      if (ans.type == "list") {
        return ans
      }
      return ans
    }
    console.log("none")
  }
  Template.quiz.properties = function() {
    return Properties.find().fetch()
  }
  Template.quiz.events({
    'click #skip' : function(event) {
      get_new_question($("#which-properties").val())
      // Session.set("answer", ["","info"])
    },
    'submit #quiz' : function(event) {
      console.log("submitted")
      country_obj =Countries.findOne({country: Session.get("cppair_quiz").country})
      answer = $("#question").val()
      ans = Session.get("answer")
      if (Session.get("answer").type=="list"){
        if (_.contains(ans.answer, answer) && !_.contains(ans.correct, answer)){
          ans.correct.push(answer)
          if(ans.correct.length == ans.answer.length) {
            ans.display = ans.correct.join(", ")
            ans.cclass="alert-success"
            Session.set("answer", ans)
            setTimeout(function() {
              $("#question").val("")
              get_new_question($("#which-properties").val())
            }, 1500)
          } else {
            f = ans.correct.length + "/" + ans.answer.length
            ans.display = f + " " + ans.correct.join(", ")
            Session.set("answer", ans)
            $("#question").val("")
          }
        } else {
          $("#question").val("")
        }
      } else {
        if (answer==ans.answer) {
          ans.display = "Correct!"
          ans.cclass = "alert-success"
          Session.set("answer", ans)
          setTimeout(function() {
            $("#question").val("")
            get_new_question($("#which-properties").val())
          }, 1500)
        } else {
          $("#viewanswer").trigger("click")
        }
      }
      event.preventDefault()
    },
    'click #viewanswer' : function(event) {
      ans = Session.get("answer")
      if (ans.type=="list"){
        ans.display = ans.answer.join(", ")
      } else {
        ans.display = ans.answer
      }
      ans.cclass = "alert-error"
      Session.set("answer", ans)
      console.log(ans)
      event.preventDefault()
    },
    'change #which-properties' : function(event) {
      get_new_question($("#which-properties").val())
    }
  })
}



if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
