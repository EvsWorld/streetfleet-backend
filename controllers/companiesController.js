'use strict';

var atob = require('atob');
var bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Company = require('../models/company');

exports.signUp = async ctx => {
  const userData = ctx.request.body;
  let user = await Company.findOne({username: userData.username});

  const incompleteBody = !userData.company_name || !userData.username || !userData.email || !userData.password;

  if (user) {
    ctx.status = 400;
    ctx.body = {
      errors: [
        'Username already exist!'
      ]
    };
  } else if (incompleteBody) {
    ctx.status = 400;
    ctx.body = {
      errors: [
        'Incomplete body'
      ]
    };
  } else {
    const saltRounds = 10;
    const plaintextPsw = userData.password;
    const hashPsw = await bcrypt.hash(plaintextPsw, saltRounds);

    const company = {
      company_name: userData.company_name,
    	email: userData.email,
    	username: userData.username,
    	password: hashPsw,
    	fleet:[]
    }

    try {
      const response = await Company.create(company);
      ctx.body = {
        company_name: response.company_name,
        username: response.username,
        email: response.email
      };
      ctx.status = 201;
    } catch (e) {
      console.error(e);
      ctx.status = 500;
      ctx.body = {
        message: e.message
      };
    }
  }
};

exports.signIn = async ctx => {
  if (!ctx.headers['authorization']) {
    ctx.status = 400;
    ctx.body = {
			errors: [
				'Basic authorization in header is missing'
			]
		};
    return;
  }
  const b64 = atob(ctx.headers['authorization'].split(' ').pop());
  const [username, passwordReceived] = b64.split(':');
  const company = await Company.findOne({username: username});
  if (company) {
    const areCompatible = await bcrypt.compare(passwordReceived, company.password);
    if (areCompatible) {
      const payload = {
        username: company.username,
        password: company.password
      }
      ctx.status = 200;
      ctx.body = {
        username: company.username,
        json_token: jwt.sign(payload, "$secretword")
      }
    } else {
      ctx.status = 401;
      ctx.body = {
  			errors: [
  				'Unauthorized'
  			]
  		};
    }
  } else {
    ctx.status = 404;
    ctx.body = {
			errors: [
				'Username not found'
			]
		};
  }
};


exports.updateCompany = async ctx => {
  const userData = ctx.request.body;
  const incompleteBody = !userData.company_name || !userData.username || !userData.email || !userData.old_password || !userData.new_password;

  if (incompleteBody) {
    ctx.status = 400;
    ctx.body = {
      errors: [
        'Bad Request - the request could not be understood or was missing required parameters.\n (incomplete body, wrong old password)'
      ]
    };
  }
  const company = await Company.findOne({username: ctx.company.username});
  if (company) {
    console.log('ctx.company: ', ctx.company);
    console.log('userData.old_password: ', userData.old_password);
    console.log('company.password: ', company.password);
    const areCompatible = await bcrypt.compare(userData.old_password, company.password);
    if (areCompatible) {
      const updatedVehicle = {
  			company_name: userData.company_name,
  			username: userData.username,
  			email: userData.email,
  			password: userData.password,
  		}
  		for (let key in updatedVehicle) company[key] = updatedVehicle[key];
  		try {
  			await ctx.company.save();
  			ctx.status = 204;
  		} catch (e) {
  			console.error(e);
  			ctx.status = 500;
  			ctx.body = {
  				message: e.message
  			};
  		}
    } else {
      ctx.status = 401;
      ctx.body = {
        errors: [
          'The wrong old password was entered'
        ]
      };
    }
  } else {
    ctx.status = 404;
    ctx.body = {
      errors: [
        'Username not found'
      ]
    };
  }
};
